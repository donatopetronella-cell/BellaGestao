import type { Metadata } from 'next'
import { Download, Receipt, TrendingUp, Users } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import {
  getBillingSummary,
  getRevenueByProduct,
  getRevenueByProfessional,
  getRevenueByService,
} from '@/features/reports/service'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Relatórios' }

interface PageProps {
  searchParams: Promise<{ mes?: string }>
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function RelatoriosPage({ searchParams }: PageProps) {
  const context = await requirePermission('reports.view')
  const params = await searchParams
  const canExport = context.permissions.has('reports.export')
  const month = params.mes ?? currentMonth()

  const [summary, byProfessional, byService, byProduct] = await Promise.all([
    getBillingSummary(context.tenant.id, month),
    getRevenueByProfessional(context.tenant.id, month),
    getRevenueByService(context.tenant.id, month),
    getRevenueByProduct(context.tenant.id, month),
  ])

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Faturamento, ticket médio, lucro e desempenho por profissional, serviço e produto."
      />

      <form className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="month"
          name="mes"
          defaultValue={month}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
        />
        {canExport ? (
          <div className="ml-auto flex flex-wrap gap-2">
            <ExportLink href={`/api/relatorios/vendas?mes=${month}`}>Vendas (CSV)</ExportLink>
            <ExportLink href={`/api/relatorios/comissoes?mes=${month}`}>Comissões (CSV)</ExportLink>
            <ExportLink href={`/api/relatorios/financeiro?mes=${month}`}>Financeiro (CSV)</ExportLink>
          </div>
        ) : null}
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Faturamento" value={formatCurrency(summary.revenueTotal)} icon={TrendingUp} />
        <StatCard label="Vendas no mês" value={String(summary.salesCount)} icon={Receipt} />
        <StatCard label="Ticket médio" value={formatCurrency(summary.ticketAverage)} icon={Users} />
        <StatCard
          label="Lucro estimado"
          value={formatCurrency(summary.profit)}
          hint="Receitas liquidadas − despesas pagas"
          tone={summary.profit >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownCard title="Por profissional" rows={byProfessional} />
        <BreakdownCard title="Por serviço" rows={byService} />
        <BreakdownCard title="Por produto" rows={byProduct} />
      </div>
    </>
  )
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string
  rows: Array<{ id: string; name: string; total: number; count: number }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted-foreground)]">Sem dados neste período.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH className="text-right">Qtd.</TH>
                <TH className="text-right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {rows.slice(0, 10).map((row) => (
                <TR key={row.id}>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="text-right">{row.count}</TD>
                  <TD className="text-right">{formatCurrency(row.total)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ExportLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--muted)]"
    >
      <Download className="size-4" /> {children}
    </a>
  )
}
