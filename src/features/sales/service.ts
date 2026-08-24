import 'server-only'
import type { CommissionKind, SaleItemKind, SaleStatus } from '@/generated/prisma/enums'
import { withTenant, type TenantClient } from '@/lib/db'
import { conflict, notFound, validationError } from '@/lib/errors'
import { applyStockMovement, getDefaultBranch } from '@/features/inventory/service'
import { resolveProductCommission } from '@/features/commissions/service'
import type { CreateSaleInput } from '@/validators/sale'

interface ResolvedItem {
  kind: SaleItemKind
  productId: string | null
  serviceId: string | null
  professionalId: string | null
  description: string
  quantity: number
  unitPrice: number
  total: number
  commissionKind: CommissionKind
  commissionRate: number
  commissionAmount: number
}

async function resolveSaleItem(
  tx: TenantClient,
  tenantId: string,
  item: { kind: 'PRODUCT' | 'SERVICE'; itemId: string; professionalId: string | null; quantity: number },
): Promise<ResolvedItem> {
  if (item.kind === 'PRODUCT') {
    const product = await tx.product.findFirst({
      where: { id: item.itemId, tenantId, deletedAt: null, isActive: true, isForSale: true },
      select: { id: true, name: true, price: true },
    })
    if (!product) throw notFound('Produto não encontrado ou indisponível para venda.')

    const unitPrice = Number(product.price)
    const total = Math.round(unitPrice * item.quantity * 100) / 100
    const commission = await resolveProductCommission(tx, tenantId, {
      productId: product.id,
      professionalId: item.professionalId,
      baseAmount: total,
    })

    return {
      kind: 'PRODUCT',
      productId: product.id,
      serviceId: null,
      professionalId: item.professionalId,
      description: product.name,
      quantity: item.quantity,
      unitPrice,
      total,
      commissionKind: commission.kind,
      commissionRate: commission.rateValue,
      commissionAmount: commission.amount,
    }
  }

  const service = await tx.service.findFirst({
    where: { id: item.itemId, tenantId, deletedAt: null, isActive: true },
    select: { id: true, name: true, price: true, commissionKind: true, commissionValue: true },
  })
  if (!service) throw notFound('Serviço não encontrado ou indisponível para venda.')

  let unitPrice = Number(service.price)
  let commissionValue = Number(service.commissionValue)

  if (item.professionalId) {
    const [override, professional] = await Promise.all([
      tx.serviceProfessional.findFirst({
        where: { tenantId, serviceId: service.id, professionalId: item.professionalId },
        select: { price: true, commissionValue: true },
      }),
      tx.professional.findFirst({
        where: { id: item.professionalId, tenantId, deletedAt: null },
        select: { commissionPercent: true },
      }),
    ])
    if (!professional) throw notFound('Profissional não encontrado neste salão.')

    if (override?.price !== null && override?.price !== undefined) {
      unitPrice = Number(override.price)
    }
    commissionValue =
      override?.commissionValue === null || override?.commissionValue === undefined
        ? Number(service.commissionValue) || Number(professional.commissionPercent)
        : Number(override.commissionValue)
  }

  const total = Math.round(unitPrice * item.quantity * 100) / 100
  const commissionAmount = item.professionalId
    ? service.commissionKind === 'FIXED'
      ? commissionValue
      : Math.round(((total * commissionValue) / 100) * 100) / 100
    : 0

  return {
    kind: 'SERVICE',
    productId: null,
    serviceId: service.id,
    professionalId: item.professionalId,
    description: service.name,
    quantity: item.quantity,
    unitPrice,
    total,
    commissionKind: service.commissionKind,
    commissionRate: item.professionalId ? commissionValue : 0,
    commissionAmount,
  }
}

export interface CreateSaleResult {
  saleId: string
  saleNumber: number
  total: number
  cashRegisterOpen: boolean
}

/**
 * Point-of-sale checkout: mirrors `finishAppointment`'s single-transaction
 * shape, but for walk-in products and services. Debits stock automatically
 * for each product sold and books the same revenue/cash/commission trail.
 */
export async function createSale(
  tenantId: string,
  input: CreateSaleInput,
  meta: { userId?: string | null },
): Promise<CreateSaleResult> {
  return withTenant(
    tenantId,
    async (tx) => {
      const branch = await getDefaultBranch(tx, tenantId)

      const resolved = await Promise.all(
        input.items.map((item) => resolveSaleItem(tx, tenantId, item)),
      )

      for (const item of resolved) {
        if (item.kind !== 'PRODUCT' || !item.productId) continue
        const current = await tx.inventoryItem.findUnique({
          where: { branchId_productId: { branchId: branch.id, productId: item.productId } },
          select: { quantity: true },
        })
        const available = Number(current?.quantity ?? 0)
        if (available < item.quantity) {
          throw conflict(
            `Estoque insuficiente para ${item.description} (disponível: ${available}).`,
          )
        }
      }

      const subtotal = resolved.reduce((sum, item) => sum + item.total, 0)
      const discount = Math.min(input.discount, subtotal)
      const total = Math.round((subtotal - discount) * 100) / 100

      const paid =
        Math.round(input.payments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100
      if (Math.abs(paid - total) > 0.01) {
        throw validationError(
          `A soma dos pagamentos (${paid.toFixed(2)}) não confere com o total (${total.toFixed(2)}).`,
        )
      }

      if (input.clientId) {
        const client = await tx.client.findFirst({
          where: { id: input.clientId, tenantId, deletedAt: null },
          select: { id: true },
        })
        if (!client) throw notFound('Cliente não encontrado.')
      }

      const lastSale = await tx.sale.findFirst({
        where: { tenantId },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      const saleNumber = (lastSale?.number ?? 0) + 1
      const openRegister = await tx.cashRegister.findFirst({
        where: { tenantId, status: 'OPEN' },
        select: { id: true },
      })
      const now = new Date()
      const status: SaleStatus = 'PAID'

      const sale = await tx.sale.create({
        data: {
          tenantId,
          branchId: branch.id,
          clientId: input.clientId,
          cashRegisterId: openRegister?.id ?? null,
          number: saleNumber,
          subtotal,
          discount,
          total,
          status,
          soldById: meta.userId ?? null,
          soldAt: now,
          payments: {
            create: input.payments.map((payment) => ({
              tenantId,
              method: payment.method,
              amount: payment.amount,
              installments: payment.installments,
              cashRegisterId: openRegister?.id ?? null,
              paidAt: now,
            })),
          },
        },
        select: { id: true, number: true },
      })

      const referenceMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

      for (const item of resolved) {
        const saleItem = await tx.saleItem.create({
          data: {
            tenantId,
            saleId: sale.id,
            kind: item.kind,
            productId: item.productId,
            serviceId: item.serviceId,
            professionalId: item.professionalId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            commissionAmount: item.commissionAmount,
          },
          select: { id: true },
        })

        if (item.kind === 'PRODUCT' && item.productId) {
          await applyStockMovement(tx, {
            tenantId,
            branchId: branch.id,
            productId: item.productId,
            type: 'SALE',
            quantity: -item.quantity,
            referenceType: 'sale',
            referenceId: sale.id,
            userId: meta.userId,
          })
        }

        if (item.commissionAmount > 0 && item.professionalId) {
          await tx.commission.create({
            data: {
              tenantId,
              professionalId: item.professionalId,
              saleItemId: saleItem.id,
              baseAmount: item.total,
              kind: item.commissionKind,
              rateValue: item.commissionRate,
              amount: item.commissionAmount,
              status: 'PENDING',
              referenceMonth,
            },
          })
        }
      }

      await tx.revenue.create({
        data: {
          tenantId,
          branchId: branch.id,
          description: `Venda #${saleNumber}`,
          amount: total,
          method: input.payments[0]?.method ?? null,
          status: 'SETTLED',
          receivedAt: now,
          referenceType: 'sale',
          referenceId: sale.id,
        },
      })

      if (openRegister) {
        for (const payment of input.payments) {
          await tx.cashMovement.create({
            data: {
              tenantId,
              cashRegisterId: openRegister.id,
              type: 'SALE',
              method: payment.method,
              amount: payment.amount,
              description: `Venda #${saleNumber}`,
              referenceType: 'sale',
              referenceId: sale.id,
              createdById: meta.userId ?? null,
            },
          })
        }
      }

      return {
        saleId: sale.id,
        saleNumber: sale.number,
        total,
        cashRegisterOpen: openRegister !== null,
      }
    },
    meta.userId ?? null,
  )
}

export interface SaleListItem {
  id: string
  number: number
  soldAt: Date
  clientName: string | null
  itemsSummary: string
  total: number
  status: SaleStatus
}

export interface SaleListResult {
  items: SaleListItem[]
  total: number
  page: number
  perPage: number
}

export async function listSales(
  tenantId: string,
  filters: { page?: number; perPage?: number } = {},
): Promise<SaleListResult> {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(100, filters.perPage ?? 20)

  return withTenant(tenantId, async (tx) => {
    const total = await tx.sale.count({ where: { tenantId } })
    const rows = await tx.sale.findMany({
      where: { tenantId },
      orderBy: { soldAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        number: true,
        soldAt: true,
        total: true,
        status: true,
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
      },
    })

    return {
      total,
      page,
      perPage,
      items: rows.map((row) => ({
        id: row.id,
        number: row.number,
        soldAt: row.soldAt,
        clientName: row.client?.name ?? null,
        itemsSummary: row.items.map((item) => item.description).join(', '),
        total: Number(row.total),
        status: row.status,
      })),
    }
  })
}

export async function listSalesForExport(
  tenantId: string,
  month: string,
): Promise<SaleListItem[]> {
  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthNumber = Number(monthText)
  const start = new Date(Date.UTC(year, monthNumber - 1, 1))
  const end = new Date(Date.UTC(year, monthNumber, 1))

  return withTenant(tenantId, async (tx) => {
    const rows = await tx.sale.findMany({
      where: { tenantId, soldAt: { gte: start, lt: end } },
      orderBy: { soldAt: 'desc' },
      select: {
        id: true,
        number: true,
        soldAt: true,
        total: true,
        status: true,
        client: { select: { name: true } },
        items: { select: { description: true, quantity: true } },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      number: row.number,
      soldAt: row.soldAt,
      clientName: row.client?.name ?? null,
      itemsSummary: row.items.map((item) => item.description).join(', '),
      total: Number(row.total),
      status: row.status,
    }))
  })
}
