import 'server-only'
import type { CommissionKind } from '@/generated/prisma/enums'
import { withTenant, type TenantClient } from '@/lib/db'
import { conflict, notFound } from '@/lib/errors'
import type { CommissionRuleInput } from '@/validators/commission'

export interface CommissionRuleRow {
  id: string
  professionalId: string | null
  professionalName: string | null
  productId: string | null
  productName: string | null
  appliesTo: 'SERVICE' | 'PRODUCT' | 'ALL'
  kind: CommissionKind
  value: number
  priority: number
  isActive: boolean
}

export async function listCommissionRules(tenantId: string): Promise<CommissionRuleRow[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.commissionRule.findMany({
      where: { tenantId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        appliesTo: true,
        kind: true,
        value: true,
        priority: true,
        isActive: true,
        professional: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    professionalId: row.professional?.id ?? null,
    professionalName: row.professional?.name ?? null,
    productId: row.product?.id ?? null,
    productName: row.product?.name ?? null,
    appliesTo: row.appliesTo,
    kind: row.kind,
    value: Number(row.value),
    priority: row.priority,
    isActive: row.isActive,
  }))
}

export async function createCommissionRule(
  tenantId: string,
  input: CommissionRuleInput,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const rule = await tx.commissionRule.create({
      data: {
        tenantId,
        professionalId: input.professionalId,
        productId: input.productId,
        appliesTo: input.appliesTo,
        kind: input.kind,
        value: input.value,
        priority: input.priority,
        isActive: input.isActive,
      },
      select: { id: true },
    })
    return rule.id
  })
}

export async function updateCommissionRule(
  tenantId: string,
  ruleId: string,
  input: CommissionRuleInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.commissionRule.updateMany({
      where: { id: ruleId, tenantId },
      data: {
        professionalId: input.professionalId,
        productId: input.productId,
        appliesTo: input.appliesTo,
        kind: input.kind,
        value: input.value,
        priority: input.priority,
        isActive: input.isActive,
      },
    })
    if (result.count === 0) throw notFound('Regra de comissão não encontrada.')
  })
}

export async function deleteCommissionRule(tenantId: string, ruleId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.commissionRule.deleteMany({ where: { id: ruleId, tenantId } })
    if (result.count === 0) throw notFound('Regra de comissão não encontrada.')
  })
}

/**
 * Picks the best matching active rule for a product sold by a professional:
 * an exact product+professional match outranks a product-only or
 * professional-only rule, which outranks a catch-all rule; ties break by
 * `priority`. Returns a zero commission when nothing matches.
 */
export async function resolveProductCommission(
  tx: TenantClient,
  tenantId: string,
  params: { productId: string; professionalId: string | null; baseAmount: number },
): Promise<{ kind: CommissionKind; rateValue: number; amount: number }> {
  const candidates = await tx.commissionRule.findMany({
    where: {
      tenantId,
      isActive: true,
      appliesTo: { in: ['PRODUCT', 'ALL'] },
      OR: [{ productId: params.productId }, { productId: null }],
      AND: [{ OR: [{ professionalId: params.professionalId }, { professionalId: null }] }],
    },
    select: { productId: true, professionalId: true, kind: true, value: true, priority: true },
  })
  if (candidates.length === 0) {
    return { kind: 'PERCENT', rateValue: 0, amount: 0 }
  }

  const best = candidates.reduce((current, rule) => {
    const score = (rule.productId ? 2 : 0) + (rule.professionalId ? 1 : 0)
    const currentScore = (current.productId ? 2 : 0) + (current.professionalId ? 1 : 0)
    if (score !== currentScore) return score > currentScore ? rule : current
    return rule.priority > current.priority ? rule : current
  })

  const rateValue = Number(best.value)
  const amount =
    best.kind === 'FIXED'
      ? rateValue
      : Math.round(((params.baseAmount * rateValue) / 100) * 100) / 100

  return { kind: best.kind, rateValue, amount }
}

export interface CommissionRow {
  id: string
  professionalId: string
  professionalName: string
  baseAmount: number
  kind: CommissionKind
  rateValue: number
  amount: number
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELED'
  referenceMonth: Date
  createdAt: Date
  source: 'appointment' | 'sale'
}

export interface CommissionListFilters {
  professionalId?: string | null
  month?: string | null
  status?: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELED' | null
}

function monthRange(month: string): { start: Date; end: Date } {
  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthNumber = Number(monthText)
  const start = new Date(Date.UTC(year, monthNumber - 1, 1))
  const end = new Date(Date.UTC(year, monthNumber, 1))
  return { start, end }
}

export async function listCommissions(
  tenantId: string,
  filters: CommissionListFilters = {},
): Promise<CommissionRow[]> {
  const range = filters.month ? monthRange(filters.month) : null

  const rows = await withTenant(tenantId, (tx) =>
    tx.commission.findMany({
      where: {
        tenantId,
        ...(filters.professionalId ? { professionalId: filters.professionalId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(range ? { referenceMonth: { gte: range.start, lt: range.end } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        professionalId: true,
        baseAmount: true,
        kind: true,
        rateValue: true,
        amount: true,
        status: true,
        referenceMonth: true,
        createdAt: true,
        appointmentId: true,
        professional: { select: { name: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    professionalId: row.professionalId,
    professionalName: row.professional.name,
    baseAmount: Number(row.baseAmount),
    kind: row.kind,
    rateValue: Number(row.rateValue),
    amount: Number(row.amount),
    status: row.status,
    referenceMonth: row.referenceMonth,
    createdAt: row.createdAt,
    source: row.appointmentId ? 'appointment' : 'sale',
  }))
}

export interface ProfessionalCommissionSummary {
  professionalId: string
  professionalName: string
  pending: number
  approved: number
  paid: number
  total: number
}

export async function summarizeCommissionsByProfessional(
  tenantId: string,
  month: string,
): Promise<ProfessionalCommissionSummary[]> {
  const range = monthRange(month)
  const rows = await withTenant(tenantId, (tx) =>
    tx.commission.findMany({
      where: { tenantId, referenceMonth: { gte: range.start, lt: range.end } },
      select: {
        professionalId: true,
        amount: true,
        status: true,
        professional: { select: { name: true } },
      },
    }),
  )

  const map = new Map<string, ProfessionalCommissionSummary>()
  for (const row of rows) {
    const amount = Number(row.amount)
    const entry = map.get(row.professionalId) ?? {
      professionalId: row.professionalId,
      professionalName: row.professional.name,
      pending: 0,
      approved: 0,
      paid: 0,
      total: 0,
    }
    if (row.status === 'PENDING') entry.pending += amount
    if (row.status === 'APPROVED') entry.approved += amount
    if (row.status === 'PAID') entry.paid += amount
    if (row.status !== 'CANCELED') entry.total += amount
    map.set(row.professionalId, entry)
  }

  return [...map.values()].sort((a, b) => a.professionalName.localeCompare(b.professionalName))
}

async function bulkTransition(
  tenantId: string,
  ids: string[],
  from: 'PENDING' | 'APPROVED',
  to: 'APPROVED' | 'PAID',
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.commission.updateMany({
      where: { id: { in: ids }, tenantId, status: from },
      data: {
        status: to,
        paidAt: to === 'PAID' ? new Date() : undefined,
      },
    })
    if (result.count === 0) {
      throw conflict('Nenhuma comissão elegível para esta ação foi encontrada.')
    }
  })
}

export async function approveCommissions(tenantId: string, ids: string[]): Promise<void> {
  await bulkTransition(tenantId, ids, 'PENDING', 'APPROVED')
}

export async function markCommissionsPaid(tenantId: string, ids: string[]): Promise<void> {
  await bulkTransition(tenantId, ids, 'APPROVED', 'PAID')
}
