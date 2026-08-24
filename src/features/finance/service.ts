import 'server-only'
import type { FinancialKind, FinancialStatus, PaymentMethod } from '@/generated/prisma/enums'
import { withTenant } from '@/lib/db'
import { conflict, forbidden, notFound } from '@/lib/errors'
import { getDefaultBranch } from '@/features/inventory/service'
import type { ExpenseInput, RevenueInput } from '@/validators/finance'

export async function listFinancialCategories(
  tenantId: string,
  kind?: FinancialKind,
): Promise<Array<{ id: string; name: string; kind: FinancialKind }>> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.financialCategory.findMany({
      where: { tenantId, ...(kind ? { kind } : {}) },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, kind: true },
    }),
  )
  return rows
}

export async function createFinancialCategory(
  tenantId: string,
  input: { name: string; kind: FinancialKind },
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const duplicate = await tx.financialCategory.findFirst({
      where: { tenantId, name: input.name, kind: input.kind },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe uma categoria com este nome.')

    const category = await tx.financialCategory.create({
      data: { tenantId, name: input.name, kind: input.kind },
      select: { id: true },
    })
    return category.id
  })
}

export interface RevenueRow {
  id: string
  description: string
  amount: number
  method: PaymentMethod | null
  status: FinancialStatus
  dueDate: Date | null
  receivedAt: Date | null
  categoryName: string | null
  isAutomatic: boolean
  createdAt: Date
}

export interface ExpenseRow {
  id: string
  description: string
  amount: number
  method: PaymentMethod | null
  status: FinancialStatus
  dueDate: Date | null
  paidAt: Date | null
  isRecurring: boolean
  categoryName: string | null
  supplierName: string | null
  createdAt: Date
}

function monthRange(month: string): { start: Date; end: Date } {
  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthNumber = Number(monthText)
  const start = new Date(Date.UTC(year, monthNumber - 1, 1))
  const end = new Date(Date.UTC(year, monthNumber, 1))
  return { start, end }
}

export async function listRevenues(
  tenantId: string,
  filters: { month?: string; status?: FinancialStatus } = {},
): Promise<RevenueRow[]> {
  const range = filters.month ? monthRange(filters.month) : null
  const rows = await withTenant(tenantId, (tx) =>
    tx.revenue.findMany({
      where: {
        tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
        amount: true,
        method: true,
        status: true,
        dueDate: true,
        receivedAt: true,
        referenceType: true,
        createdAt: true,
        category: { select: { name: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    dueDate: row.dueDate,
    receivedAt: row.receivedAt,
    categoryName: row.category?.name ?? null,
    isAutomatic: row.referenceType === 'sale',
    createdAt: row.createdAt,
  }))
}

export async function createRevenue(tenantId: string, input: RevenueInput): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const branch = await getDefaultBranch(tx, tenantId)
    const revenue = await tx.revenue.create({
      data: {
        tenantId,
        branchId: branch.id,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        method: input.method,
        status: input.status,
        dueDate: input.dueDate,
        receivedAt: input.status === 'SETTLED' ? new Date() : null,
      },
      select: { id: true },
    })
    return revenue.id
  })
}

export async function settleRevenue(tenantId: string, revenueId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.revenue.updateMany({
      where: { id: revenueId, tenantId, status: 'PENDING' },
      data: { status: 'SETTLED', receivedAt: new Date() },
    })
    if (result.count === 0) throw notFound('Receita pendente não encontrada.')
  })
}

export async function deleteRevenue(tenantId: string, revenueId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const existing = await tx.revenue.findFirst({
      where: { id: revenueId, tenantId },
      select: { referenceType: true },
    })
    if (!existing) throw notFound('Receita não encontrada.')
    if (existing.referenceType === 'sale') {
      throw forbidden('Receitas geradas por uma venda não podem ser removidas aqui.')
    }
    await tx.revenue.delete({ where: { id: revenueId } })
  })
}

export async function listExpenses(
  tenantId: string,
  filters: { month?: string; status?: FinancialStatus } = {},
): Promise<ExpenseRow[]> {
  const range = filters.month ? monthRange(filters.month) : null
  const rows = await withTenant(tenantId, (tx) =>
    tx.expense.findMany({
      where: {
        tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
        amount: true,
        method: true,
        status: true,
        dueDate: true,
        paidAt: true,
        isRecurring: true,
        createdAt: true,
        category: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    dueDate: row.dueDate,
    paidAt: row.paidAt,
    isRecurring: row.isRecurring,
    categoryName: row.category?.name ?? null,
    supplierName: row.supplier?.name ?? null,
    createdAt: row.createdAt,
  }))
}

export async function createExpense(tenantId: string, input: ExpenseInput): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const branch = await getDefaultBranch(tx, tenantId)
    const expense = await tx.expense.create({
      data: {
        tenantId,
        branchId: branch.id,
        categoryId: input.categoryId,
        supplierId: input.supplierId,
        description: input.description,
        amount: input.amount,
        method: input.method,
        status: input.status,
        dueDate: input.dueDate,
        paidAt: input.status === 'SETTLED' ? new Date() : null,
        isRecurring: input.isRecurring,
      },
      select: { id: true },
    })
    return expense.id
  })
}

export async function settleExpense(tenantId: string, expenseId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.expense.updateMany({
      where: { id: expenseId, tenantId, status: 'PENDING' },
      data: { status: 'SETTLED', paidAt: new Date() },
    })
    if (result.count === 0) throw notFound('Despesa pendente não encontrada.')
  })
}

export async function deleteExpense(tenantId: string, expenseId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.expense.deleteMany({ where: { id: expenseId, tenantId } })
    if (result.count === 0) throw notFound('Despesa não encontrada.')
  })
}

export interface CashFlowSummary {
  revenueTotal: number
  revenueSettled: number
  expenseTotal: number
  expenseSettled: number
  net: number
}

export async function getCashFlowSummary(tenantId: string, month: string): Promise<CashFlowSummary> {
  const range = monthRange(month)
  return withTenant(tenantId, async (tx) => {
    const [revenues, expenses] = await Promise.all([
      tx.revenue.findMany({
        where: { tenantId, createdAt: { gte: range.start, lt: range.end } },
        select: { amount: true, status: true },
      }),
      tx.expense.findMany({
        where: { tenantId, createdAt: { gte: range.start, lt: range.end } },
        select: { amount: true, status: true },
      }),
    ])

    const revenueTotal = revenues.reduce((sum, row) => sum + Number(row.amount), 0)
    const revenueSettled = revenues
      .filter((row) => row.status === 'SETTLED')
      .reduce((sum, row) => sum + Number(row.amount), 0)
    const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount), 0)
    const expenseSettled = expenses
      .filter((row) => row.status === 'SETTLED')
      .reduce((sum, row) => sum + Number(row.amount), 0)

    return {
      revenueTotal,
      revenueSettled,
      expenseTotal,
      expenseSettled,
      net: Math.round((revenueSettled - expenseSettled) * 100) / 100,
    }
  })
}
