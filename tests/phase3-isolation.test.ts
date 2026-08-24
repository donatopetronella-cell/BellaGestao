import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { archiveProduct, createProduct } from '@/features/products/service'
import { adjustStock } from '@/features/inventory/service'
import { createCommissionRule, resolveProductCommission } from '@/features/commissions/service'
import { createSale } from '@/features/sales/service'
import { settleExpense, settleRevenue } from '@/features/finance/service'
import { AppError } from '@/lib/errors'
import { disconnectDb, withTenant } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

/**
 * Phase 3 repeats the Phase 1/2 guarantee for the new domain: a salon never
 * reads, writes or spends against another salon's products, stock,
 * commission rules or ledger entries.
 */
describe('isolamento multi-tenant (fase 3)', () => {
  let tenantA: TestTenant
  let tenantB: TestTenant
  let productB: string

  beforeAll(async () => {
    tenantA = await createTestTenant('p3-a')
    tenantB = await createTestTenant('p3-b')
    productB = await createProduct(tenantB.tenantId, {
      name: 'Produto de B',
      categoryId: null,
      supplierId: null,
      brand: '',
      sku: 'ISO-001',
      barcode: '',
      unit: 'un',
      cost: 5,
      price: 20,
      minStock: 0,
      isForSale: true,
      isSupply: false,
      isActive: true,
    })
    await adjustStock(
      tenantB.tenantId,
      { productId: productB, type: 'PURCHASE', quantity: 10 },
      { userId: tenantB.ownerId },
    )
  })

  afterAll(async () => {
    await destroyTestTenant(tenantA)
    await destroyTestTenant(tenantB)
    await disconnectDb()
  })

  it('não é possível arquivar um produto de outro salão', async () => {
    await expect(archiveProduct(tenantA.tenantId, productB)).rejects.toThrow(AppError)
  })

  it('o mesmo SKU pode existir em salões diferentes', async () => {
    const idA = await createProduct(tenantA.tenantId, {
      name: 'Produto de A',
      categoryId: null,
      supplierId: null,
      brand: '',
      sku: 'ISO-001',
      barcode: '',
      unit: 'un',
      cost: 5,
      price: 20,
      minStock: 0,
      isForSale: true,
      isSupply: false,
      isActive: true,
    })
    expect(idA).not.toBe(productB)
  })

  it('não é possível vender um produto de outro salão', async () => {
    await expect(
      createSale(
        tenantA.tenantId,
        {
          clientId: null,
          discount: 0,
          items: [{ kind: 'PRODUCT', itemId: productB, professionalId: null, quantity: 1 }],
          payments: [{ method: 'CASH', amount: 20, installments: 1 }],
        },
        { userId: tenantA.ownerId },
      ),
    ).rejects.toThrow(/não encontrado/)
  })

  it('uma regra de comissão de um salão nunca é aplicada no outro', async () => {
    await createCommissionRule(tenantB.tenantId, {
      professionalId: null,
      productId: null,
      appliesTo: 'PRODUCT',
      kind: 'FIXED',
      value: 50,
      priority: 100,
      isActive: true,
    })

    const productA = await createProduct(tenantA.tenantId, {
      name: 'Outro produto de A',
      categoryId: null,
      supplierId: null,
      brand: '',
      sku: 'ISO-002',
      barcode: '',
      unit: 'un',
      cost: 5,
      price: 20,
      minStock: 0,
      isForSale: true,
      isSupply: false,
      isActive: true,
    })

    const result = await withTenant(tenantA.tenantId, (tx) =>
      resolveProductCommission(tx, tenantA.tenantId, {
        productId: productA,
        professionalId: tenantA.professionalId,
        baseAmount: 100,
      }),
    )
    expect(result.amount).toBe(0)
  })

  it('não é possível liquidar receita ou despesa de outro salão', async () => {
    const { getAdminDb } = await import('@/lib/db')
    const revenue = await getAdminDb().revenue.create({
      data: {
        tenantId: tenantB.tenantId,
        branchId: tenantB.branchId,
        description: 'Receita de B',
        amount: 100,
        status: 'PENDING',
      },
      select: { id: true },
    })
    const expense = await getAdminDb().expense.create({
      data: {
        tenantId: tenantB.tenantId,
        branchId: tenantB.branchId,
        description: 'Despesa de B',
        amount: 100,
        status: 'PENDING',
      },
      select: { id: true },
    })

    await expect(settleRevenue(tenantA.tenantId, revenue.id)).rejects.toThrow(AppError)
    await expect(settleExpense(tenantA.tenantId, expense.id)).rejects.toThrow(AppError)
  })
})
