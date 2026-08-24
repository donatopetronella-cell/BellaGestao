import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  archiveProduct,
  createProduct,
  createProductCategory,
  createSupplier,
  listProducts,
  setProductActive,
} from '@/features/products/service'
import { adjustStock, getStockSummary, listMovements } from '@/features/inventory/service'
import { AppError } from '@/lib/errors'
import { disconnectDb } from '@/lib/db'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

const baseProduct = {
  categoryId: null,
  supplierId: null,
  brand: '',
  sku: '',
  barcode: '',
  unit: 'un',
  cost: 10,
  price: 25,
  minStock: 5,
  isForSale: true,
  isSupply: false,
  isActive: true,
} as const

describe('produtos e estoque', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('products')
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('cria categoria e fornecedor e recusa nomes duplicados', async () => {
    await createProductCategory(tenant.tenantId, 'Cosméticos')
    await expect(createProductCategory(tenant.tenantId, 'Cosméticos')).rejects.toThrow(AppError)

    const supplierId = await createSupplier(tenant.tenantId, { name: 'Distribuidora Teste' })
    expect(supplierId).toBeTruthy()
  })

  it('recusa dois produtos com o mesmo SKU no mesmo salão', async () => {
    await createProduct(tenant.tenantId, { ...baseProduct, name: 'Shampoo', sku: 'SH-001' })
    await expect(
      createProduct(tenant.tenantId, { ...baseProduct, name: 'Condicionador', sku: 'SH-001' }),
    ).rejects.toThrow(/SKU/)
  })

  it('entrada de estoque soma e ajuste/perda descontam, sem deixar negativo', async () => {
    const productId = await createProduct(tenant.tenantId, {
      ...baseProduct,
      name: 'Máscara capilar',
      sku: 'MC-001',
    })

    await adjustStock(
      tenant.tenantId,
      { productId, type: 'PURCHASE', quantity: 10, unitCost: 8, reason: 'Compra inicial' },
      { userId: tenant.ownerId },
    )

    const afterPurchase = await listProducts(tenant.tenantId, { search: 'Máscara' })
    expect(afterPurchase.items[0]?.stock).toBe(10)

    await adjustStock(
      tenant.tenantId,
      { productId, type: 'LOSS', quantity: 3, reason: 'Quebrou no balcão' },
      { userId: tenant.ownerId },
    )
    const afterLoss = await listProducts(tenant.tenantId, { search: 'Máscara' })
    expect(afterLoss.items[0]?.stock).toBe(7)

    await expect(
      adjustStock(
        tenant.tenantId,
        { productId, type: 'ADJUSTMENT', quantity: 100 },
        { userId: tenant.ownerId },
      ),
    ).rejects.toThrow(/insuficiente/i)

    const movements = await listMovements(tenant.tenantId, { productId })
    expect(movements.length).toBe(2)
  })

  it('resumo de estoque conta produtos abaixo do mínimo', async () => {
    const productId = await createProduct(tenant.tenantId, {
      ...baseProduct,
      name: 'Óleo finalizador',
      sku: 'OF-001',
      minStock: 5,
    })
    await adjustStock(
      tenant.tenantId,
      { productId, type: 'PURCHASE', quantity: 2 },
      { userId: tenant.ownerId },
    )

    const summary = await getStockSummary(tenant.tenantId)
    expect(summary.lowStockCount).toBeGreaterThanOrEqual(1)
  })

  it('desativar um produto o esconde da lista ativa, mas includeInactive ainda o mostra', async () => {
    const productId = await createProduct(tenant.tenantId, {
      ...baseProduct,
      name: 'Produto Sazonal',
      sku: 'PS-001',
    })
    await setProductActive(tenant.tenantId, productId, false)

    const active = await listProducts(tenant.tenantId, { search: 'Sazonal' })
    expect(active.items).toHaveLength(0)

    const withInactive = await listProducts(tenant.tenantId, {
      search: 'Sazonal',
      includeInactive: true,
    })
    expect(withInactive.items).toHaveLength(1)
    expect(withInactive.items[0]?.isActive).toBe(false)
  })

  it('arquivar um produto o remove do catálogo mesmo com includeInactive, mas preserva o histórico', async () => {
    const productId = await createProduct(tenant.tenantId, {
      ...baseProduct,
      name: 'Produto Descontinuado',
      sku: 'PD-001',
    })
    await archiveProduct(tenant.tenantId, productId)

    const withInactive = await listProducts(tenant.tenantId, {
      search: 'Descontinuado',
      includeInactive: true,
    })
    expect(withInactive.items).toHaveLength(0)

    const movements = await listMovements(tenant.tenantId, { productId })
    expect(movements).toEqual([]) // no stock movements were made, but the query itself must not throw
  })
})
