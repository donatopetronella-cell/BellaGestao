import 'server-only'
import { withTenant } from '@/lib/db'

function monthRange(month: string): { start: Date; end: Date } {
  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthNumber = Number(monthText)
  const start = new Date(Date.UTC(year, monthNumber - 1, 1))
  const end = new Date(Date.UTC(year, monthNumber, 1))
  return { start, end }
}

export interface BillingSummary {
  revenueTotal: number
  expenseTotal: number
  profit: number
  salesCount: number
  ticketAverage: number
}

export async function getBillingSummary(tenantId: string, month: string): Promise<BillingSummary> {
  const range = monthRange(month)
  return withTenant(tenantId, async (tx) => {
    const [revenues, expenses, sales] = await Promise.all([
      tx.revenue.aggregate({
        where: { tenantId, status: 'SETTLED', createdAt: { gte: range.start, lt: range.end } },
        _sum: { amount: true },
      }),
      tx.expense.aggregate({
        where: { tenantId, status: 'SETTLED', createdAt: { gte: range.start, lt: range.end } },
        _sum: { amount: true },
      }),
      tx.sale.aggregate({
        where: { tenantId, status: 'PAID', soldAt: { gte: range.start, lt: range.end } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ])

    const revenueTotal = Number(revenues._sum.amount ?? 0)
    const expenseTotal = Number(expenses._sum.amount ?? 0)
    const salesCount = sales._count._all
    const salesTotal = Number(sales._sum.total ?? 0)

    return {
      revenueTotal,
      expenseTotal,
      profit: Math.round((revenueTotal - expenseTotal) * 100) / 100,
      salesCount,
      ticketAverage: salesCount > 0 ? Math.round((salesTotal / salesCount) * 100) / 100 : 0,
    }
  })
}

export interface BreakdownRow {
  id: string
  name: string
  total: number
  count: number
}

async function breakdownByProfessional(tenantId: string, month: string): Promise<BreakdownRow[]> {
  const range = monthRange(month)
  const rows = await withTenant(tenantId, (tx) =>
    tx.saleItem.findMany({
      where: {
        tenantId,
        professionalId: { not: null },
        sale: { status: 'PAID', soldAt: { gte: range.start, lt: range.end } },
      },
      select: { total: true, professional: { select: { id: true, name: true } } },
    }),
  )

  const map = new Map<string, BreakdownRow>()
  for (const row of rows) {
    if (!row.professional) continue
    const entry = map.get(row.professional.id) ?? {
      id: row.professional.id,
      name: row.professional.name,
      total: 0,
      count: 0,
    }
    entry.total += Number(row.total)
    entry.count += 1
    map.set(row.professional.id, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

async function breakdownByCatalogItem(
  tenantId: string,
  month: string,
  kind: 'SERVICE' | 'PRODUCT',
): Promise<BreakdownRow[]> {
  const range = monthRange(month)
  const rows = await withTenant(tenantId, (tx) =>
    tx.saleItem.findMany({
      where: {
        tenantId,
        kind,
        sale: { status: 'PAID', soldAt: { gte: range.start, lt: range.end } },
      },
      select: {
        total: true,
        description: true,
        serviceId: true,
        productId: true,
      },
    }),
  )

  const map = new Map<string, BreakdownRow>()
  for (const row of rows) {
    const id = row.serviceId ?? row.productId ?? row.description
    const entry = map.get(id) ?? { id, name: row.description, total: 0, count: 0 }
    entry.total += Number(row.total)
    entry.count += 1
    map.set(id, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export async function getRevenueByProfessional(
  tenantId: string,
  month: string,
): Promise<BreakdownRow[]> {
  return breakdownByProfessional(tenantId, month)
}

export async function getRevenueByService(tenantId: string, month: string): Promise<BreakdownRow[]> {
  return breakdownByCatalogItem(tenantId, month, 'SERVICE')
}

export async function getRevenueByProduct(tenantId: string, month: string): Promise<BreakdownRow[]> {
  return breakdownByCatalogItem(tenantId, month, 'PRODUCT')
}
