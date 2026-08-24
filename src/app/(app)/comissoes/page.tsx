import type { Metadata } from 'next'
import Link from 'next/link'
import { Percent } from 'lucide-react'
import { requireAnyPermission } from '@/lib/auth/context'
import {
  listCommissionRules,
  listCommissions,
  summarizeCommissionsByProfessional,
} from '@/features/commissions/service'
import { listProfessionals } from '@/features/professionals/service'
import { listProductOptions } from '@/features/products/service'
import { RuleDialog } from '@/features/commissions/components/rule-dialog'
import { RuleRowActions } from '@/features/commissions/components/rule-row-actions'
import {
  approveCommissionsAction,
  markCommissionsPaidAction,
} from '@/server/actions/commissions'
import { idleFormState } from '@/server/actions/types'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Comissões' }

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  PAID: 'Paga',
  CANCELED: 'Cancelada',
}

interface PageProps {
  searchParams: Promise<{
    mes?: string
    profissional?: string
    status?: string
  }>
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function approveSelectedAction(formData: FormData): Promise<void> {
  'use server'
  await approveCommissionsAction(idleFormState, formData)
}

async function markSelectedPaidAction(formData: FormData): Promise<void> {
  'use server'
  await markCommissionsPaidAction(idleFormState, formData)
}

export default async function ComissoesPage({ searchParams }: PageProps) {
  const context = await requireAnyPermission(['commissions.view', 'commissions.view_own'])
  const params = await searchParams
  const canManage = context.permissions.has('commissions.manage')
  const restrictedToOwn = !context.permissions.has('commissions.view')

  const month = params.mes ?? currentMonth()
  const status = params.status as 'PENDING' | 'APPROVED' | 'PAID' | undefined
  const professionalId = restrictedToOwn
    ? (context.professionalId ?? '')
    : (params.profissional ?? null)

  const [professionals, products, commissions, summary, rules] = await Promise.all([
    listProfessionals(context.tenant.id),
    canManage ? listProductOptions(context.tenant.id) : Promise.resolve([]),
    listCommissions(context.tenant.id, {
      professionalId,
      month,
      status: status ?? null,
    }),
    canManage
      ? summarizeCommissionsByProfessional(context.tenant.id, month)
      : Promise.resolve([]),
    canManage ? listCommissionRules(context.tenant.id) : Promise.resolve([]),
  ])

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
  }))

  const buildHref = (overrides: Record<string, string | null>): string => {
    const query = new URLSearchParams()
    query.set('mes', overrides.mes ?? month)
    const nextProfessional = overrides.profissional ?? professionalId
    if (nextProfessional) query.set('profissional', nextProfessional)
    const nextStatus = overrides.status ?? status ?? ''
    if (nextStatus) query.set('status', nextStatus)
    return `/comissoes?${query.toString()}`
  }

  return (
    <>
      <PageHeader
        title="Comissões"
        description="Cálculo automático nas vendas e no fechamento mensal por profissional."
        actions={
          canManage ? (
            <RuleDialog professionals={professionalOptions} products={products} />
          ) : null
        }
      />

      {canManage && summary.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fechamento de {month}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Profissional</TH>
                  <TH className="text-right">Pendente</TH>
                  <TH className="text-right">Aprovada</TH>
                  <TH className="text-right">Paga</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {summary.map((row) => (
                  <TR key={row.professionalId}>
                    <TD className="font-medium">{row.professionalName}</TD>
                    <TD className="text-right">{formatCurrency(row.pending)}</TD>
                    <TD className="text-right">{formatCurrency(row.approved)}</TD>
                    <TD className="text-right">{formatCurrency(row.paid)}</TD>
                    <TD className="text-right font-medium">{formatCurrency(row.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex items-center gap-2">
          <input
            type="month"
            name="mes"
            defaultValue={month}
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
          />
          {!restrictedToOwn ? (
            <select
              name="profissional"
              defaultValue={professionalId ?? ''}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
            >
              <option value="">Todos os profissionais</option>
              {professionalOptions.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>

        <div className="ml-auto flex flex-wrap gap-1">
          <FilterChip href={buildHref({ status: '' })} active={!status}>
            Todas
          </FilterChip>
          <FilterChip href={buildHref({ status: 'PENDING' })} active={status === 'PENDING'}>
            Pendentes
          </FilterChip>
          <FilterChip href={buildHref({ status: 'APPROVED' })} active={status === 'APPROVED'}>
            Aprovadas
          </FilterChip>
          <FilterChip href={buildHref({ status: 'PAID' })} active={status === 'PAID'}>
            Pagas
          </FilterChip>
        </div>
      </div>

      {commissions.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Nenhuma comissão neste período"
          description="As comissões são lançadas automaticamente ao finalizar atendimentos e vendas."
        />
      ) : (
        <Card className="mb-6">
          <CardContent className="p-0">
            <form action={status === 'APPROVED' ? markSelectedPaidAction : approveSelectedAction}>
              {canManage && (status === 'PENDING' || status === 'APPROVED') ? (
                <div className="flex justify-end p-3">
                  <Button type="submit" size="sm">
                    {status === 'APPROVED' ? 'Marcar selecionadas como pagas' : 'Aprovar selecionadas'}
                  </Button>
                </div>
              ) : null}
              <Table>
                <THead>
                  <TR>
                    {canManage && (status === 'PENDING' || status === 'APPROVED') ? (
                      <TH className="w-8" />
                    ) : null}
                    <TH>Profissional</TH>
                    <TH>Origem</TH>
                    <TH className="text-right">Base</TH>
                    <TH className="text-right">Taxa</TH>
                    <TH className="text-right">Valor</TH>
                    <TH>Status</TH>
                    <TH>Data</TH>
                  </TR>
                </THead>
                <TBody>
                  {commissions.map((commission) => (
                    <TR key={commission.id}>
                      {canManage && (status === 'PENDING' || status === 'APPROVED') ? (
                        <TD>
                          <input type="checkbox" name="ids" value={commission.id} />
                        </TD>
                      ) : null}
                      <TD className="font-medium">{commission.professionalName}</TD>
                      <TD className="text-[var(--muted-foreground)]">
                        {commission.source === 'appointment' ? 'Atendimento' : 'Venda'}
                      </TD>
                      <TD className="text-right">{formatCurrency(commission.baseAmount)}</TD>
                      <TD className="text-right">
                        {commission.kind === 'PERCENT'
                          ? `${commission.rateValue}%`
                          : formatCurrency(commission.rateValue)}
                      </TD>
                      <TD className="text-right font-medium">
                        {formatCurrency(commission.amount)}
                      </TD>
                      <TD>
                        <Badge
                          variant={commission.status === 'PAID' ? 'success' : 'outline'}
                        >
                          {STATUS_LABELS[commission.status]}
                        </Badge>
                      </TD>
                      <TD className="text-[var(--muted-foreground)]">
                        {formatDate(commission.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </form>
          </CardContent>
        </Card>
      )}

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Regras de comissão de produtos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rules.length === 0 ? (
              <p className="p-4 text-sm text-[var(--muted-foreground)]">
                Sem regras cadastradas — vendas de produto não geram comissão até que uma
                regra seja criada.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Profissional</TH>
                    <TH>Produto</TH>
                    <TH className="text-right">Valor</TH>
                    <TH className="text-right">Prioridade</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Ações</TH>
                  </TR>
                </THead>
                <TBody>
                  {rules.map((rule) => (
                    <TR key={rule.id}>
                      <TD>{rule.professionalName ?? 'Todos'}</TD>
                      <TD>{rule.productName ?? 'Todos'}</TD>
                      <TD className="text-right">
                        {rule.kind === 'PERCENT' ? `${rule.value}%` : formatCurrency(rule.value)}
                      </TD>
                      <TD className="text-right">{rule.priority}</TD>
                      <TD>
                        {rule.isActive ? (
                          <Badge variant="success">Ativa</Badge>
                        ) : (
                          <Badge variant="outline">Inativa</Badge>
                        )}
                      </TD>
                      <TD>
                        <RuleRowActions
                          rule={rule}
                          professionals={professionalOptions}
                          products={products}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'border-brand-300 bg-[var(--accent)] text-[var(--accent-foreground)]'
          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
      }`}
    >
      {children}
    </Link>
  )
}
