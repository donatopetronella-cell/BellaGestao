import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createProduct } from '@/features/products/service'
import { adjustStock } from '@/features/inventory/service'
import { createCommissionRule } from '@/features/commissions/service'
import { createSale, listSales } from '@/features/sales/service'
import { getAdminDb, disconnectDb, withTenant } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('vendas (PDV)', () => {
  let tenant: TestTenant
  let productId: string

  beforeAll(async () => {
    tenant = await createTestTenant('sales')
    productId = await createProduct(tenant.tenantId, {
      name: 'Shampoo PDV',
      categoryId: null,
      supplierId: null,
      brand: '',
      sku: 'PDV-001',
      barcode: '',
      unit: 'un',
      cost: 10,
      price: 40,
      minStock: 0,
      isForSale: true,
      isSupply: false,
      isActive: true,
    })
    await adjustStock(
      tenant.tenantId,
      { productId, type: 'PURCHASE', quantity: 5 },
      { userId: tenant.ownerId },
    )
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('rejeita quando os pagamentos não fecham com o total', async () => {
    await expect(
      createSale(
        tenant.tenantId,
        {
          clientId: null,
          discount: 0,
          items: [{ kind: 'PRODUCT', itemId: productId, professionalId: null, quantity: 1 }],
          payments: [{ method: 'PIX', amount: 10, installments: 1 }],
        },
        { userId: tenant.ownerId },
      ),
    ).rejects.toThrow(/não confere/)
  })

  it('vende produto, debita o estoque e calcula comissão pela regra do produto', async () => {
    await createCommissionRule(tenant.tenantId, {
      professionalId: null,
      productId,
      appliesTo: 'PRODUCT',
      kind: 'PERCENT',
      value: 10,
      priority: 0,
      isActive: true,
    })

    const result = await createSale(
      tenant.tenantId,
      {
        clientId: tenant.clientId,
        discount: 0,
        items: [
          { kind: 'PRODUCT', itemId: productId, professionalId: tenant.professionalId, quantity: 2 },
        ],
        payments: [{ method: 'PIX', amount: 80, installments: 1 }],
      },
      { userId: tenant.ownerId },
    )
    expect(result.total).toBe(80)

    const stock = await withTenant(tenant.tenantId, (tx) =>
      tx.inventoryItem.findFirst({ where: { tenantId: tenant.tenantId, productId } }),
    )
    expect(Number(stock?.quantity)).toBe(3) // 5 - 2

    const commission = await getAdminDb().commission.findFirst({
      where: { tenantId: tenant.tenantId, professionalId: tenant.professionalId },
    })
    expect(commission).not.toBeNull()
    expect(Number(commission?.amount)).toBe(8) // 10% of 80

    const revenue = await getAdminDb().revenue.findFirst({
      where: { tenantId: tenant.tenantId, referenceId: result.saleId },
    })
    expect(Number(revenue?.amount)).toBe(80)
  })

  it('recusa vender mais produto do que há em estoque', async () => {
    await expect(
      createSale(
        tenant.tenantId,
        {
          clientId: null,
          discount: 0,
          items: [{ kind: 'PRODUCT', itemId: productId, professionalId: null, quantity: 999 }],
          payments: [{ method: 'CASH', amount: 999 * 40, installments: 1 }],
        },
        { userId: tenant.ownerId },
      ),
    ).rejects.toThrow(/estoque insuficiente/i)
  })

  it('vende serviço avulso, aplica desconto e comissiona pelo percentual padrão do profissional', async () => {
    await getAdminDb().professional.update({
      where: { id: tenant.professionalId },
      data: { commissionPercent: 20 },
    })

    const result = await createSale(
      tenant.tenantId,
      {
        clientId: null,
        discount: 10,
        items: [
          { kind: 'SERVICE', itemId: tenant.serviceId, professionalId: tenant.professionalId, quantity: 1 },
        ],
        payments: [{ method: 'CASH', amount: 90, installments: 1 }],
      },
      { userId: tenant.ownerId },
    )
    expect(result.total).toBe(90) // 100 - 10 discount

    const commission = await getAdminDb().commission.findFirst({
      where: { tenantId: tenant.tenantId, saleItemId: { not: null }, kind: 'PERCENT', rateValue: 20 },
    })
    expect(Number(commission?.amount)).toBe(20) // 20% of the 100 line total, before the sale-level discount

    const sales = await listSales(tenant.tenantId)
    // 2 successful sales so far in this suite; the payment-mismatch and
    // insufficient-stock attempts both threw and rolled back.
    expect(sales.total).toBeGreaterThanOrEqual(2)
  })
})
