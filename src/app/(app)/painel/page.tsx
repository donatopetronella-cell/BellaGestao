import Link from 'next/link'
import type { Metadata } from 'next'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  Clock,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { getDashboardData, getTodayAgenda } from '@/features/dashboard/queries'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { RangeFilter } from '@/features/dashboard/components/range-filter'
import {
  RevenueAreaChart,
  RevenueBarChart,
} from '@/features/dashboard/components/revenue-chart'
import { AppointmentStatusBadge } from '@/features/dashboard/components/appointment-status-badge'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { isDashboardRange, type DashboardRange } from '@/lib/dates'
import { formatCurrency, formatNumber, formatPercent, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const context = await requirePermission('dashboard.view')
  const { periodo } = await searchParams
  const range: DashboardRange =
    periodo && isDashboardRange(periodo) ? periodo : 'month'

  // A professional only ever sees their own numbers.
  const scopedProfessionalId = context.permissions.has('agenda.view')
    ? null
    : context.professionalId

  const [data, agenda] = await Promise.all([
    getDashboardData(context.tenant.id, {
      range,
      timeZone: context.tenant.timezone,
      professionalId: scopedProfessionalId,
    }),
    getTodayAgenda(context.tenant.id, {
      timeZone: context.tenant.timezone,
      professionalId: scopedProfessionalId,
    }),
  ])

  const canSeeFinance = context.permissions.has('finance.view')

  return (
    <>
      <PageHeader
        title={`Olá, ${context.user.name.split(' ')[0]}`}
        description={`Resumo de ${context.tenant.name} · ${data.rangeLabel}`}
        actions={<RangeFilter active={range} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Atendimentos hoje"
          value={formatNumber(data.today.scheduled)}
          hint={`${data.today.confirmed} confirmados · ${data.today.finished} finalizados`}
          icon={CalendarDays}
        />
        <StatCard
          label="Previsto para hoje"
          value={formatCurrency(data.today.expectedRevenue)}
          hint={`${formatCurrency(data.today.receivedRevenue)} já recebidos`}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Equipe ativa"
          value={formatNumber(data.today.activeProfessionals)}
          hint={`${data.today.freeSlots} horários livres estimados`}
          icon={Users}
        />
        <StatCard
          label="Cancelamentos hoje"
          value={formatNumber(data.today.canceled + data.today.noShow)}
          hint={`${data.today.noShow} não compareceram`}
          tone={data.today.canceled + data.today.noShow > 0 ? 'warning' : 'default'}
          icon={AlertTriangle}
        />
      </section>

      {canSeeFinance ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento dos últimos meses</CardTitle>
              <CardDescription>
                Atendimentos finalizados, mês a mês.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueAreaChart data={data.monthlyRevenue} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta do mês</CardTitle>
              <CardDescription>
                {data.finance.monthlyGoal
                  ? `Meta de ${formatCurrency(data.finance.monthlyGoal)}`
                  : 'Defina uma meta em Configurações.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-display text-3xl">
                  {formatCurrency(data.finance.revenueMonth)}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Recebido no mês
                </p>
              </div>
              {data.finance.goalProgress !== null ? (
                <div className="space-y-1.5">
                  <Progress value={data.finance.goalProgress} label="Progresso da meta" />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatPercent(data.finance.goalProgress)} da meta
                  </p>
                </div>
              ) : null}
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">Previsto</dt>
                  <dd>{formatCurrency(data.finance.forecastMonth)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">Despesas</dt>
                  <dd>{formatCurrency(data.finance.expensesMonth)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>Lucro estimado</dt>
                  <dd
                    className={
                      data.finance.estimatedProfit >= 0 ? 'text-success' : 'text-danger'
                    }
                  >
                    {formatCurrency(data.finance.estimatedProfit)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Agenda de hoje</CardTitle>
              <CardDescription>Próximos atendimentos.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {agenda.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="Nenhum atendimento para hoje"
                description="Assim que houver agendamentos, eles aparecem aqui."
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {agenda.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-3">
                    <span className="flex w-14 shrink-0 items-center gap-1 text-sm font-medium">
                      <Clock className="size-3.5 text-[var(--muted-foreground)]" />
                      {formatTime(entry.startsAt, context.tenant.timezone)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.clientName}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">
                        {entry.services.join(', ') || 'Sem serviços'} ·{' '}
                        {entry.professionalName}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={entry.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Base do salão · {data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Novos"
                value={formatNumber(data.clients.newInRange)}
                icon={UserPlus}
                className="shadow-none"
              />
              <StatCard
                label="Recorrentes"
                value={formatNumber(data.clients.returning)}
                icon={TrendingUp}
                className="shadow-none"
              />
              <StatCard
                label="Inativos +90 dias"
                value={formatNumber(data.clients.inactive90d)}
                tone={data.clients.inactive90d > 0 ? 'warning' : 'default'}
                className="shadow-none"
              />
              <StatCard
                label="Taxa de retorno"
                value={formatPercent(data.clients.returnRate)}
                className="shadow-none"
              />
            </div>
            {data.clients.inactive90d > 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
                <p className="font-medium">
                  {data.clients.inactive90d} clientes sem retornar há mais de 90 dias.
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  A campanha de reativação por WhatsApp entra na fase 4.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento diário</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueBarChart data={data.dailyRevenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços mais vendidos</CardTitle>
            <CardDescription>{data.rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topServices.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Sem serviços finalizados no período"
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Serviço</TH>
                    <TH className="text-right">Qtd.</TH>
                    <TH className="text-right">Faturamento</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.topServices.map((service) => (
                    <TR key={service.name}>
                      <TD className="font-medium">{service.name}</TD>
                      <TD className="text-right">{formatNumber(service.quantity)}</TD>
                      <TD className="text-right">{formatCurrency(service.revenue)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {context.permissions.has('professionals.view') ? (
        <section className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho da equipe</CardTitle>
              <CardDescription>
                Atendimentos finalizados · {data.rangeLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.professionals.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Ainda sem atendimentos finalizados"
                  description="Os indicadores por profissional aparecem assim que os atendimentos forem finalizados."
                />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Profissional</TH>
                      <TH className="text-right">Atendimentos</TH>
                      <TH className="text-right">Faturamento</TH>
                      <TH className="text-right">Ticket médio</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.professionals.map((professional) => (
                      <TR key={professional.id}>
                        <TD className="font-medium">{professional.name}</TD>
                        <TD className="text-right">
                          {formatNumber(professional.appointments)}
                        </TD>
                        <TD className="text-right">
                          {formatCurrency(professional.revenue)}
                        </TD>
                        <TD className="text-right">
                          {formatCurrency(professional.averageTicket)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </>
  )
}
