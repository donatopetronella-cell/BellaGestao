import type { Metadata } from 'next'
import { Wallet } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { getOpenRegister, listRegisters } from '@/features/cash/service'
import { OpenRegisterForm } from '@/features/cash/components/open-register-form'
import { CloseRegisterDialog } from '@/features/cash/components/close-register-dialog'
import { CashMovementDialog } from '@/features/cash/components/cash-movement-dialog'
import { CASH_MOVEMENT_LABELS, PAYMENT_METHOD_LABELS } from '@/validators/cash'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Caixa' }

export default async function CashPage() {
  const context = await requirePermission('cash.view')
  const canOpen = context.permissions.has('cash.open')
  const canClose = context.permissions.has('cash.close')
  const canMove = context.permissions.has('cash.move')

  const [register, history] = await Promise.all([
    getOpenRegister(context.tenant.id),
    listRegisters(context.tenant.id),
  ])

  const timeZone = context.tenant.timezone

  return (
    <>
      <PageHeader
        title="Caixa"
        description="Abertura, fechamento, sangria e reforço."
      />

      {!register ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle>Abrir caixa</CardTitle>
              <CardDescription>
                Informe o troco inicial para começar o dia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canOpen ? (
                <OpenRegisterForm />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Peça a quem administra o salão para abrir o caixa.
                </p>
              )}
            </CardContent>
          </Card>

          <RegisterHistory history={history} timeZone={timeZone} />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Dinheiro esperado na gaveta"
              value={formatCurrency(register.cashInDrawer)}
            />
            <SummaryCard
              label="Total recebido"
              value={formatCurrency(register.salesTotal)}
              hint={`${register.movements.filter((m) => m.type === 'SALE').length} venda(s)`}
            />
            <SummaryCard label="Entradas" value={formatCurrency(register.totalIn)} />
            <SummaryCard label="Saídas" value={formatCurrency(register.totalOut)} />
          </section>

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="size-4 text-brand-600" /> Caixa aberto
                </CardTitle>
                <CardDescription>
                  Aberto às {formatTime(register.openedAt, timeZone)} com{' '}
                  {formatCurrency(register.openingAmount)}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {canMove ? (
                  <>
                    <CashMovementDialog type="REINFORCEMENT" />
                    <CashMovementDialog type="WITHDRAWAL" />
                  </>
                ) : null}
                {canClose ? <CloseRegisterDialog register={register} /> : null}
              </div>
            </CardHeader>
            <CardContent>
              {register.totalsByMethod.length > 0 ? (
                <div className="mb-4 grid gap-2 sm:grid-cols-3">
                  {register.totalsByMethod.map((row) => (
                    <div
                      key={row.method}
                      className="rounded-lg border border-[var(--border)] p-3 text-sm"
                    >
                      <p className="text-[var(--muted-foreground)]">
                        {PAYMENT_METHOD_LABELS[row.method]}
                      </p>
                      <p className="font-medium">{formatCurrency(row.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {register.movements.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Nenhuma movimentação ainda"
                  description="Vendas finalizadas na agenda aparecem aqui automaticamente."
                />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Horário</TH>
                      <TH>Tipo</TH>
                      <TH>Forma</TH>
                      <TH>Descrição</TH>
                      <TH className="text-right">Valor</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {register.movements.map((movement) => (
                      <TR key={movement.id}>
                        <TD>{formatTime(movement.createdAt, timeZone)}</TD>
                        <TD>
                          <Badge
                            variant={
                              movement.type === 'OUT' || movement.type === 'WITHDRAWAL'
                                ? 'danger'
                                : 'success'
                            }
                          >
                            {CASH_MOVEMENT_LABELS[movement.type]}
                          </Badge>
                        </TD>
                        <TD className="text-[var(--muted-foreground)]">
                          {PAYMENT_METHOD_LABELS[movement.method]}
                        </TD>
                        <TD>{movement.description ?? '—'}</TD>
                        <TD className="text-right">{formatCurrency(movement.amount)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
        <p className="font-display text-2xl">{value}</p>
        {hint ? (
          <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RegisterHistory({
  history,
  timeZone,
}: {
  history: Awaited<ReturnType<typeof listRegisters>>
  timeZone: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico</CardTitle>
        <CardDescription>Últimos fechamentos de caixa.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhum caixa foi aberto ainda.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Data</TH>
                <TH className="text-right">Abertura</TH>
                <TH className="text-right">Fechamento</TH>
                <TH className="text-right">Diferença</TH>
              </TR>
            </THead>
            <TBody>
              {history.map((row) => (
                <TR key={row.id}>
                  <TD>{formatDate(row.openedAt, timeZone)}</TD>
                  <TD className="text-right">{formatCurrency(row.openingAmount)}</TD>
                  <TD className="text-right">
                    {row.closingAmount !== null
                      ? formatCurrency(row.closingAmount)
                      : '—'}
                  </TD>
                  <TD className="text-right">
                    {row.difference !== null ? (
                      <span
                        className={
                          Math.abs(row.difference) < 0.01
                            ? 'text-success'
                            : 'text-warning'
                        }
                      >
                        {formatCurrency(row.difference)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
