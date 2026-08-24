import 'server-only'
import type { InventoryMovementType } from '@/generated/prisma/enums'
import { withTenant, type TenantClient } from '@/lib/db'
import { conflict, notFound } from '@/lib/errors'
import type { StockAdjustmentInput } from '@/validators/product'

const INBOUND: InventoryMovementType[] = ['PURCHASE', 'RETURN']

/**
 * Applies a signed stock movement inside an existing transaction. Used both
 * by manual stock adjustments and by the point of sale (which debits stock
 * automatically when a product is sold).
 */
export async function applyStockMovement(
  tx: TenantClient,
  params: {
    tenantId: string
    branchId: string
    productId: string
    type: InventoryMovementType
    quantity: number
    unitCost?: number | null
    reason?: string | null
    referenceType?: string | null
    referenceId?: string | null
    userId?: string | null
  },
): Promise<void> {
  await tx.inventoryItem.upsert({
    where: { branchId_productId: { branchId: params.branchId, productId: params.productId } },
    create: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      productId: params.productId,
      quantity: params.quantity,
    },
    update: {
      quantity: { increment: params.quantity },
    },
  })

  await tx.inventoryMovement.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      productId: params.productId,
      type: params.type,
      quantity: params.quantity,
      unitCost: params.unitCost ?? null,
      reason: params.reason ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      createdById: params.userId ?? null,
    },
  })
}

export async function getDefaultBranch(tx: TenantClient, tenantId: string) {
  const branch = await tx.branch.findFirst({
    where: { tenantId, isDefault: true },
    select: { id: true },
  })
  if (!branch) throw notFound('Nenhuma unidade configurada.')
  return branch
}

export async function adjustStock(
  tenantId: string,
  input: StockAdjustmentInput,
  meta: { userId?: string | null },
): Promise<void> {
  await withTenant(
    tenantId,
    async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: input.productId, tenantId, deletedAt: null },
        select: { id: true },
      })
      if (!product) throw notFound('Produto não encontrado.')

      const branch = await getDefaultBranch(tx, tenantId)
      const signed = INBOUND.includes(input.type) ? input.quantity : -input.quantity

      if (signed < 0) {
        const current = await tx.inventoryItem.findUnique({
          where: {
            branchId_productId: { branchId: branch.id, productId: input.productId },
          },
          select: { quantity: true },
        })
        const available = Number(current?.quantity ?? 0)
        if (available + signed < 0) {
          throw conflict(
            `Estoque insuficiente (disponível: ${available}, solicitado: ${input.quantity}).`,
          )
        }
      }

      await applyStockMovement(tx, {
        tenantId,
        branchId: branch.id,
        productId: input.productId,
        type: input.type,
        quantity: signed,
        unitCost: input.unitCost ?? null,
        reason: input.reason || null,
        userId: meta.userId,
      })
    },
    meta.userId ?? null,
  )
}

export interface MovementRow {
  id: string
  productId: string
  productName: string
  type: InventoryMovementType
  quantity: number
  unitCost: number | null
  reason: string | null
  createdAt: Date
}

export async function listMovements(
  tenantId: string,
  filters: { productId?: string; take?: number } = {},
): Promise<MovementRow[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.inventoryMovement.findMany({
      where: { tenantId, ...(filters.productId ? { productId: filters.productId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: filters.take ?? 50,
      select: {
        id: true,
        type: true,
        quantity: true,
        unitCost: true,
        reason: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    productId: row.product.id,
    productName: row.product.name,
    type: row.type,
    quantity: Number(row.quantity),
    unitCost: row.unitCost === null ? null : Number(row.unitCost),
    reason: row.reason,
    createdAt: row.createdAt,
  }))
}

export interface StockSummary {
  totalProducts: number
  lowStockCount: number
  stockValue: number
}

export async function getStockSummary(tenantId: string): Promise<StockSummary> {
  return withTenant(tenantId, async (tx) => {
    const products = await tx.product.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: {
        cost: true,
        minStock: true,
        inventory: { select: { quantity: true } },
      },
    })

    let lowStockCount = 0
    let stockValue = 0
    for (const product of products) {
      const stock = product.inventory.reduce((sum, item) => sum + Number(item.quantity), 0)
      stockValue += stock * Number(product.cost)
      if (Number(product.minStock) > 0 && stock <= Number(product.minStock)) {
        lowStockCount += 1
      }
    }

    return { totalProducts: products.length, lowStockCount, stockValue }
  })
}
