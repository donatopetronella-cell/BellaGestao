import 'server-only'
import { withTenant } from '@/lib/db'
import { conflict, notFound } from '@/lib/errors'
import type { ProductInput } from '@/validators/product'

export interface ProductListItem {
  id: string
  name: string
  brand: string | null
  sku: string | null
  barcode: string | null
  unit: string
  cost: number
  price: number
  minStock: number
  stock: number
  isForSale: boolean
  isSupply: boolean
  isActive: boolean
  categoryName: string | null
  supplierName: string | null
}

export interface ProductListResult {
  items: ProductListItem[]
  total: number
  page: number
  perPage: number
}

export interface ProductListFilters {
  search?: string
  categoryId?: string | null
  lowStockOnly?: boolean
  includeInactive?: boolean
  page?: number
  perPage?: number
}

function toListItem(row: {
  id: string
  name: string
  brand: string | null
  sku: string | null
  barcode: string | null
  unit: string
  cost: unknown
  price: unknown
  minStock: unknown
  isForSale: boolean
  isSupply: boolean
  isActive: boolean
  category: { name: string } | null
  supplier: { name: string } | null
  inventory: Array<{ quantity: unknown }>
}): ProductListItem {
  const stock = row.inventory.reduce((sum, item) => sum + Number(item.quantity), 0)
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    sku: row.sku,
    barcode: row.barcode,
    unit: row.unit,
    cost: Number(row.cost),
    price: Number(row.price),
    minStock: Number(row.minStock),
    stock,
    isForSale: row.isForSale,
    isSupply: row.isSupply,
    isActive: row.isActive,
    categoryName: row.category?.name ?? null,
    supplierName: row.supplier?.name ?? null,
  }
}

export async function listProducts(
  tenantId: string,
  filters: ProductListFilters = {},
): Promise<ProductListResult> {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(100, filters.perPage ?? 20)

  return withTenant(tenantId, async (tx) => {
    const where = {
      tenantId,
      deletedAt: null,
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' as const } }
        : {}),
    }

    const total = await tx.product.count({ where })
    const rows = await tx.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip: filters.lowStockOnly ? undefined : (page - 1) * perPage,
      take: filters.lowStockOnly ? undefined : perPage,
      select: {
        id: true,
        name: true,
        brand: true,
        sku: true,
        barcode: true,
        unit: true,
        cost: true,
        price: true,
        minStock: true,
        isForSale: true,
        isSupply: true,
        isActive: true,
        category: { select: { name: true } },
        supplier: { select: { name: true } },
        inventory: { select: { quantity: true } },
      },
    })

    let items = rows.map(toListItem)
    if (filters.lowStockOnly) {
      items = items.filter((item) => item.minStock > 0 && item.stock <= item.minStock)
      const start = (page - 1) * perPage
      return {
        total: items.length,
        page,
        perPage,
        items: items.slice(start, start + perPage),
      }
    }

    return { total, page, perPage, items }
  })
}

export interface ProductDetail extends ProductListItem {
  categoryId: string | null
  supplierId: string | null
}

export async function getProduct(
  tenantId: string,
  productId: string,
): Promise<ProductDetail> {
  const row = await withTenant(tenantId, (tx) =>
    tx.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        brand: true,
        sku: true,
        barcode: true,
        unit: true,
        cost: true,
        price: true,
        minStock: true,
        isForSale: true,
        isSupply: true,
        isActive: true,
        categoryId: true,
        supplierId: true,
        category: { select: { name: true } },
        supplier: { select: { name: true } },
        inventory: { select: { quantity: true } },
      },
    }),
  )
  if (!row) throw notFound('Produto não encontrado.')
  return { ...toListItem(row), categoryId: row.categoryId, supplierId: row.supplierId }
}

export async function createProduct(
  tenantId: string,
  input: ProductInput,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    if (input.sku) {
      const duplicate = await tx.product.findFirst({
        where: { tenantId, sku: input.sku, deletedAt: null },
        select: { id: true },
      })
      if (duplicate) throw conflict('Já existe um produto com este SKU.')
    }

    const product = await tx.product.create({
      data: {
        tenantId,
        name: input.name,
        categoryId: input.categoryId,
        supplierId: input.supplierId,
        brand: input.brand || null,
        sku: input.sku || null,
        barcode: input.barcode || null,
        unit: input.unit,
        cost: input.cost,
        price: input.price,
        minStock: input.minStock,
        isForSale: input.isForSale,
        isSupply: input.isSupply,
        isActive: input.isActive,
      },
      select: { id: true },
    })
    return product.id
  })
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  input: ProductInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const existing = await tx.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!existing) throw notFound('Produto não encontrado.')

    if (input.sku) {
      const duplicate = await tx.product.findFirst({
        where: { tenantId, sku: input.sku, deletedAt: null, id: { not: productId } },
        select: { id: true },
      })
      if (duplicate) throw conflict('Já existe um produto com este SKU.')
    }

    await tx.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        supplierId: input.supplierId,
        brand: input.brand || null,
        sku: input.sku || null,
        barcode: input.barcode || null,
        unit: input.unit,
        cost: input.cost,
        price: input.price,
        minStock: input.minStock,
        isForSale: input.isForSale,
        isSupply: input.isSupply,
        isActive: input.isActive,
      },
    })
  })
}

/** Products keep history (sales, stock movements), so removal is logical. */
export async function archiveProduct(
  tenantId: string,
  productId: string,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.product.updateMany({
      where: { id: productId, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    })
    if (result.count === 0) throw notFound('Produto não encontrado.')
  })
}

export async function setProductActive(
  tenantId: string,
  productId: string,
  isActive: boolean,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.product.updateMany({
      where: { id: productId, tenantId, deletedAt: null },
      data: { isActive },
    })
    if (result.count === 0) throw notFound('Produto não encontrado.')
  })
}

export async function listProductCategories(
  tenantId: string,
): Promise<Array<{ id: string; name: string; productCount: number }>> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.productCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, _count: { select: { products: true } } },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    productCount: row._count.products,
  }))
}

export async function createProductCategory(
  tenantId: string,
  name: string,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const duplicate = await tx.productCategory.findFirst({
      where: { tenantId, name },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe uma categoria com este nome.')

    const category = await tx.productCategory.create({
      data: { tenantId, name },
      select: { id: true },
    })
    return category.id
  })
}

export async function listProductOptions(
  tenantId: string,
): Promise<Array<{ id: string; name: string; unit: string; stock: number; price: number }>> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.product.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        unit: true,
        price: true,
        inventory: { select: { quantity: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    price: Number(row.price),
    stock: row.inventory.reduce((sum, item) => sum + Number(item.quantity), 0),
  }))
}

export interface SupplierListItem {
  id: string
  name: string
  phone: string | null
  email: string | null
  document: string | null
  notes: string | null
  productCount: number
}

export async function listSuppliers(tenantId: string): Promise<SupplierListItem[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        document: true,
        notes: true,
        _count: { select: { products: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    document: row.document,
    notes: row.notes,
    productCount: row._count.products,
  }))
}

export async function createSupplier(
  tenantId: string,
  input: {
    name: string
    phone?: string
    email?: string
    document?: string
    notes?: string
  },
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        document: input.document || null,
        notes: input.notes || null,
      },
      select: { id: true },
    })
    return supplier.id
  })
}
