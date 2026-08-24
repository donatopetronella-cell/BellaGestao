import type { Metadata } from 'next'
import { Gift } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { getLoyaltyProgram, listLoyaltyAccounts } from '@/features/loyalty/service'
import { AdjustDialog } from '@/features/loyalty/components/adjust-dialog'
import { ProgramForm } from '@/features/loyalty/components/program-form'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Fidelidade' }

interface PageProps {
  searchParams: Promise<{ busca?: string; pagina?: string }>
}

export default async function FidelidadePage({ searchParams }: PageProps) {
  const context = await requirePermission('loyalty.view')
  const params = await searchParams
  const canManage = context.permissions.has('loyalty.manage')
  const page = Math.max(1, Number(params.pagina ?? 1) || 1)

  const [program, accounts] = await Promise.all([
    getLoyaltyProgram(context.tenant.id),
    listLoyaltyAccounts(context.tenant.id, { search: params.busca, page }),
  ])

  return (
    <>
      <PageHeader
        title="Fidelidade"
        description="Pontos, cashback e recompensas."
        actions={canManage ? <AdjustDialog /> : null}
      />

      {canManage ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Programa</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgramForm program={program} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Saldo por cliente</CardTitle>
          <SearchInput placeholder="Buscar cliente…" className="max-w-xs" />
        </CardHeader>
        <CardContent className="p-0">
          {accounts.items.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="Nenhuma cliente com saldo ainda"
              description="Pontos são creditados automaticamente ao finalizar um atendimento com o programa ativo."
              className="border-0"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH className="text-right">Pontos</TH>
                  <TH className="text-right">Cashback</TH>
                  <TH className="text-right">Atendimentos</TH>
                </TR>
              </THead>
              <TBody>
                {accounts.items.map((account) => (
                  <TR key={account.id}>
                    <TD className="font-medium">{account.clientName}</TD>
                    <TD className="text-right">{account.pointsBalance}</TD>
                    <TD className="text-right">{formatCurrency(account.cashbackBalance)}</TD>
                    <TD className="text-right">{account.visits}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={accounts.page}
        perPage={accounts.perPage}
        total={accounts.total}
        buildHref={(nextPage) =>
          `/fidelidade?${params.busca ? `busca=${params.busca}&` : ''}pagina=${nextPage}`
        }
      />
    </>
  )
}
