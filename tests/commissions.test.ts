import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createProduct } from '@/features/products/service'
import {
  approveCommissions,
  createCommissionRule,
  markCommissionsPaid,
  resolveProductCommission,
  summarizeCommissionsByProfessional,
} from '@/features/commissions/service'
import { getAdminDb, disconnectDb, withTenant } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('regras de comissão', () => {
  let tenant: TestTenant
  let productId: string

  beforeAll(async () => {
    tenant = await createTestTenant('commissions')
    productId = await createProduct(tenant.tenantId, {
      name: 'Produto Regra',
      categoryId: null,
      supplierId: null,
      brand: '',
      sku: 'RULE-001',
      barcode: '',
      unit: 'un',
      cost: 5,
      price: 50,
      minStock: 0,
      isForSale: true,
      isSupply: false,
      isActive: true,
    })
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('sem regra cadastrada, a comissão do produto é zero', async () => {
    const result = await withTenant(tenant.tenantId, (tx) =>
      resolveProductCommission(tx, tenant.tenantId, {
        productId,
        professionalId: tenant.professionalId,
        baseAmount: 100,
      }),
    )
    expect(result.amount).toBe(0)
  })

  it('uma regra específica (produto + profissional) vence uma regra geral', async () => {
    await createCommissionRule(tenant.tenantId, {
      professionalId: null,
      productId: null,
      appliesTo: 'PRODUCT',
      kind: 'PERCENT',
      value: 5,
      priority: 0,
      isActive: true,
    })
    await createCommissionRule(tenant.tenantId, {
      professionalId: tenant.professionalId,
      productId,
      appliesTo: 'PRODUCT',
      kind: 'PERCENT',
      value: 15,
      priority: 0,
      isActive: true,
    })

    const result = await withTenant(tenant.tenantId, (tx) =>
      resolveProductCommission(tx, tenant.tenantId, {
        productId,
        professionalId: tenant.professionalId,
        baseAmount: 100,
      }),
    )
    expect(result.rateValue).toBe(15)
    expect(result.amount).toBe(15)
  })

  it('uma regra inativa nunca é escolhida', async () => {
    const ruleId = await createCommissionRule(tenant.tenantId, {
      professionalId: null,
      productId,
      appliesTo: 'PRODUCT',
      kind: 'FIXED',
      value: 999,
      priority: 100,
      isActive: false,
    })
    expect(ruleId).toBeTruthy()

    const result = await withTenant(tenant.tenantId, (tx) =>
      resolveProductCommission(tx, tenant.tenantId, {
        productId,
        professionalId: tenant.professionalId,
        baseAmount: 100,
      }),
    )
    expect(result.rateValue).toBe(15) // still the specific active rule from the previous test
  })

  it('fechamento mensal: aprova pendentes e depois marca como pagas', async () => {
    const referenceMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    const commission = await getAdminDb().commission.create({
      data: {
        tenantId: tenant.tenantId,
        professionalId: tenant.professionalId,
        baseAmount: 100,
        kind: 'PERCENT',
        rateValue: 10,
        amount: 10,
        status: 'PENDING',
        referenceMonth,
      },
      select: { id: true },
    })

    // Can't jump straight to paid.
    await expect(markCommissionsPaid(tenant.tenantId, [commission.id])).rejects.toThrow(AppError)

    await approveCommissions(tenant.tenantId, [commission.id])
    await markCommissionsPaid(tenant.tenantId, [commission.id])

    const paid = await getAdminDb().commission.findUnique({ where: { id: commission.id } })
    expect(paid?.status).toBe('PAID')
    expect(paid?.paidAt).not.toBeNull()

    const month = `${referenceMonth.getUTCFullYear()}-${String(referenceMonth.getUTCMonth() + 1).padStart(2, '0')}`
    const summary = await summarizeCommissionsByProfessional(tenant.tenantId, month)
    const own = summary.find((row) => row.professionalId === tenant.professionalId)
    expect(own?.paid).toBeGreaterThanOrEqual(10)
  })
})
