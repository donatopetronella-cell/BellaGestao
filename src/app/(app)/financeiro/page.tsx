import type { Metadata } from 'next'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import {
  getCashFlowSummary,
  listExpenses,
  listFinancialCategories,
  listRevenues,
} from '@/features/finance/service'
import { listSuppliers } from '@/features/products/service'
import { RevenueDialog } from '@/features/finance/components/revenue-dialog'
import { ExpenseDialog } from '@/features/finance/components/expense-dialog'
import { CategoryDialog } from '@/features/finance/components/category-dialog'
import { ExpenseRowActions, RevenueRowActions } from '@/features/finance/components/row-actions'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Financeiro' }

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SETTLED: 'Liquidada',
  CANCELED: 'Cancelada',
}

interface PageProps {
  searchParams: Promise<{ mes?: string }>
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const context = await requirePermission('finance.view')
  const params = await searchParams
  const canManage = context.permissions.has('finance.manage')
  const month = params.mes ?? currentMonth()

  const [summary, revenues, expenses, revenueCategories, expenseCategories, suppliers] =
    await Promise.all([
      getCashFlowSummary(context.tenant.id, month),
      listRevenues(context.tenant.id, { month }),
      listExpenses(context.tenant.id, { month }),
      listFinancialCategories(context.tenant.id, 'REVENUE'),
      listFinancialCategories(context.tenant.id, 'EXPENSE'),
      listSuppliers(context.tenant.id),
    ])

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e fluxo de caixa do mês."
        actions={
          canManage ? (
            <>
              <CategoryDialog />
              <ExpenseDialog categories={expenseCategories} suppliers={suppliers} />
              <RevenueDialog categories={revenueCategories} />
            </>
          ) : null
        }
      />

      <form className="mb-4">
        <input
          type="month"
          name="mes"
          defaultValue={month}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        />
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Receitas liquidadas"
          value={formatCurrency(summary.revenueSettled)}
          hint={`Total lançado: ${formatCurrency(summary.revenueTotal)}`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Despesas pagas"
          value={formatCurrency(summary.expenseSettled)}
          hint={`Total lançado: ${formatCurrency(summary.expenseTotal)}`}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label="Saldo do mês"
          value={formatCurrency(summary.net)}
          icon={Wallet}
          tone={summary.net >= 0 ? 'success' : 'danger'}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Receitas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {revenues.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">
              Nenhuma receita neste período.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Descrição</TH>
                  <TH>Categoria</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Status</TH>
                  <TH>Data</TH>
                  {canManage ? <TH className="text-right">Ações</TH> : null}
                </TR>
              </THead>
              <TBody>
                {revenues.map((revenue) => (
                  <TR key={revenue.id}>
                    <TD className="font-medium">
                      {revenue.description}
                      {revenue.isAutomatic ? (
                        <Badge variant="outline" className="ml-2">
                          Automática
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {revenue.categoryName ?? '—'}
                    </TD>
                    <TD className="text-right">{formatCurrency(revenue.amount)}</TD>
                    <TD>
                      <Badge variant={revenue.status === 'SETTLED' ? 'success' : 'warning'}>
                        {STATUS_LABELS[revenue.status]}
                      </Badge>
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {formatDate(revenue.receivedAt ?? revenue.createdAt)}
                    </TD>
                    {canManage ? (
                      <TD>
                        <RevenueRowActions
                          revenueId={revenue.id}
                          status={revenue.status}
                          isAutomatic={revenue.isAutomatic}
                        />
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Despesas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">
              Nenhuma despesa neste período.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Descrição</TH>
                  <TH>Categoria</TH>
                  <TH>Fornecedor</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Status</TH>
                  <TH>Vencimento</TH>
                  {canManage ? <TH className="text-right">Ações</TH> : null}
                </TR>
              </THead>
              <TBody>
                {expenses.map((expense) => (
                  <TR key={expense.id}>
                    <TD className="font-medium">
                      {expense.description}
                      {expense.isRecurring ? (
                        <Badge variant="outline" className="ml-2">
                          Recorrente
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {expense.categoryName ?? '—'}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {expense.supplierName ?? '—'}
                    </TD>
                    <TD className="text-right">{formatCurrency(expense.amount)}</TD>
                    <TD>
                      <Badge variant={expense.status === 'SETTLED' ? 'success' : 'warning'}>
                        {STATUS_LABELS[expense.status]}
                      </Badge>
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {expense.dueDate ? formatDate(expense.dueDate) : '—'}
                    </TD>
                    {canManage ? (
                      <TD>
                        <ExpenseRowActions expenseId={expense.id} status={expense.status} />
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
