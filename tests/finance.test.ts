import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createExpense,
  createFinancialCategory,
  createRevenue,
  deleteExpense,
  deleteRevenue,
  getCashFlowSummary,
  listExpenses,
  listRevenues,
  settleExpense,
  settleRevenue,
} from '@/features/finance/service'
import { getAdminDb, disconnectDb } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

function currentMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

describe('financeiro', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('finance')
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  it('recusa categorias duplicadas do mesmo tipo', async () => {
    await createFinancialCategory(tenant.tenantId, { name: 'Aluguel', kind: 'EXPENSE' })
    await expect(
      createFinancialCategory(tenant.tenantId, { name: 'Aluguel', kind: 'EXPENSE' }),
    ).rejects.toThrow(AppError)
  })

  it('lança receita liquidada e receita pendente, e permite liquidar a pendente', async () => {
    await createRevenue(tenant.tenantId, {
      description: 'Aluguel de cadeira',
      categoryId: null,
      amount: 300,
      method: 'PIX',
      status: 'SETTLED',
      dueDate: null,
    })
    const pendingId = await createRevenue(tenant.tenantId, {
      description: 'Parceria a receber',
      categoryId: null,
      amount: 150,
      method: null,
      status: 'PENDING',
      dueDate: null,
    })

    let revenues = await listRevenues(tenant.tenantId, { month: currentMonth() })
    expect(revenues.find((row) => row.id === pendingId)?.status).toBe('PENDING')

    await settleRevenue(tenant.tenantId, pendingId)
    revenues = await listRevenues(tenant.tenantId, { month: currentMonth() })
    expect(revenues.find((row) => row.id === pendingId)?.status).toBe('SETTLED')
  })

  it('não permite remover uma receita gerada automaticamente por uma venda', async () => {
    const revenue = await getAdminDb().revenue.create({
      data: {
        tenantId: tenant.tenantId,
        branchId: tenant.branchId,
        description: 'Venda #1',
        amount: 80,
        status: 'SETTLED',
        referenceType: 'sale',
        referenceId: tenant.clientId,
      },
      select: { id: true },
    })

    await expect(deleteRevenue(tenant.tenantId, revenue.id)).rejects.toThrow(/não podem ser removidas/)
  })

  it('lança e liquida uma despesa recorrente, depois remove', async () => {
    const expenseId = await createExpense(tenant.tenantId, {
      description: 'Conta de luz',
      categoryId: null,
      supplierId: null,
      amount: 220,
      method: 'PIX',
      status: 'PENDING',
      dueDate: null,
      isRecurring: true,
    })

    let expenses = await listExpenses(tenant.tenantId, { month: currentMonth() })
    expect(expenses.find((row) => row.id === expenseId)?.status).toBe('PENDING')

    await settleExpense(tenant.tenantId, expenseId)
    expenses = await listExpenses(tenant.tenantId, { month: currentMonth() })
    expect(expenses.find((row) => row.id === expenseId)?.status).toBe('SETTLED')

    await deleteExpense(tenant.tenantId, expenseId)
    expenses = await listExpenses(tenant.tenantId, { month: currentMonth() })
    expect(expenses.find((row) => row.id === expenseId)).toBeUndefined()
  })

  it('o fluxo de caixa do mês soma apenas receitas e despesas liquidadas', async () => {
    const summary = await getCashFlowSummary(tenant.tenantId, currentMonth())
    // Settled revenue so far: 300 (rent) + 150 (settled partnership) + 80 (sale).
    expect(summary.revenueSettled).toBeGreaterThanOrEqual(530)
    expect(summary.net).toBe(
      Math.round((summary.revenueSettled - summary.expenseSettled) * 100) / 100,
    )
  })
})
