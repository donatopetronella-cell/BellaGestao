import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import {
  getProfessional,
  getProfessionalPerformance,
} from '@/features/professionals/service'
import { ProfessionalDialog } from '@/features/professionals/components/professional-dialog'
import { WorkingHoursForm } from '@/features/professionals/components/working-hours-form'
import { AppError } from '@/lib/errors'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

export const metadata: Metadata = { title: 'Profissional' }

export default async function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const context = await requirePermission('professionals.view')
  const { id } = await params
  const canManage = context.permissions.has('professionals.manage')

  let professional
  try {
    professional = await getProfessional(context.tenant.id, id)
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  }

  const performance = await getProfessionalPerformance(
    context.tenant.id,
    id,
    context.tenant.timezone,
  )

  return (
    <>
      <Link
        href="/profissionais"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" /> Profissionais
      </Link>

      <PageHeader
        title={professional.name}
        description={professional.specialty ?? 'Sem especialidade cadastrada'}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/agenda?profissional=${professional.id}`}>
                <CalendarDays className="size-4" /> Ver agenda
              </Link>
            </Button>
            {canManage ? <ProfessionalDialog professional={professional} /> : null}
          </>
        }
      />

      <section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Atendimentos no mês"
          value={formatNumber(performance.finishedAppointments)}
        />
        <StatCard
          label="Faturamento no mês"
          value={formatCurrency(performance.revenue)}
        />
        <StatCard
          label="Ticket médio"
          value={formatCurrency(performance.averageTicket)}
        />
        <StatCard
          label="Comissão a pagar"
          value={formatCurrency(performance.commissionPending)}
          hint={`${formatCurrency(performance.commissionPaid)} já pagos`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ficha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={professional.name} className="size-12 text-sm" />
                <div>
                  <p className="font-medium">{professional.name}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {professional.isActive ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </p>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <Row label="Telefone" value={professional.phone ?? '—'} />
                <Row label="E-mail" value={professional.email ?? '—'} />
                <Row
                  label="Comissão padrão"
                  value={formatPercent(professional.commissionPercent, 0)}
                />
                <Row
                  label="Clientes atendidos no mês"
                  value={formatNumber(performance.clientsServed)}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviços habilitados</CardTitle>
              <CardDescription>
                Configure em Serviços quais profissionais executam cada item.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {professional.services.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum serviço habilitado ainda.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {professional.services.map((service) => (
                    <li key={service.id} className="flex justify-between gap-4">
                      <span>{service.name}</span>
                      <span className="text-[var(--muted-foreground)]">
                        {formatCurrency(service.customPrice ?? service.price)}
                        {service.customPrice !== null ? ' (personalizado)' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Jornada de trabalho</CardTitle>
              <CardDescription>
                Define os horários disponíveis na agenda e no agendamento online.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canManage ? (
                <WorkingHoursForm
                  professionalId={professional.id}
                  hours={professional.workingHours}
                />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Somente quem administra o salão pode alterar a jornada.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Serviços mais realizados no mês</CardTitle>
            </CardHeader>
            <CardContent>
              {performance.topServices.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum atendimento finalizado neste mês.
                </p>
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
                    {performance.topServices.map((service) => (
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
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--muted-foreground)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
