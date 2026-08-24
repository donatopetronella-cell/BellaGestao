import type { Metadata } from 'next'
import { AlertTriangle, MessageCircleQuestion, TrendingUp, UserX, Wallet } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { getBellaInsights } from '@/features/insights/service'
import { listAiQueries } from '@/features/ai/service'
import { AskForm } from '@/features/ai/components/ask-form'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Bella IA' }

export default async function BellaIaPage() {
  const context = await requirePermission('ai.use')

  const [insights, history] = await Promise.all([
    getBellaInsights(context.tenant.id, context.tenant.timezone),
    listAiQueries(context.tenant.id),
  ])

  return (
    <>
      <PageHeader
        title="Bella IA"
        description="Perguntas sobre o seu salão e insights automáticos."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(insights.revenueMonth)}
          hint={`Projeção: ${formatCurrency(insights.forecastMonth)}`}
          icon={Wallet}
        />
        <StatCard
          label="Clientes inativas"
          value={String(insights.inactiveClients)}
          hint="90+ dias sem retornar"
          icon={UserX}
          tone={insights.inactiveClients > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Taxa de retorno"
          value={`${insights.returnRate.toFixed(0)}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Estoque baixo"
          value={String(insights.lowStockProducts.length)}
          hint="produtos abaixo do mínimo"
          icon={AlertTriangle}
          tone={insights.lowStockProducts.length > 0 ? 'danger' : 'default'}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="size-4" /> Pergunte à Bella IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AskForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de perguntas</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={MessageCircleQuestion}
              title="Nenhuma pergunta ainda"
              description="Use o campo acima para perguntar sobre faturamento, clientes ou estoque."
              className="border-0"
            />
          ) : (
            <ul className="space-y-4">
              {history.map((item) => (
                <li key={item.id} className="border-b border-[var(--border)] pb-4 last:border-0">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-[var(--muted-foreground)]">
                    {item.answer}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {formatDateTime(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}
