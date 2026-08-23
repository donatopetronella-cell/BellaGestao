import type { Metadata } from 'next'
import Link from 'next/link'
import { FileUp, Users } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { listClients, type ClientFilter } from '@/features/clients/service'
import { listProfessionals } from '@/features/professionals/service'
import { ClientDialog } from '@/features/clients/components/client-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Clientes' }

const FILTERS: Array<{ value: ClientFilter; label: string }> = [
  { value: 'todos', label: 'Todas' },
  { value: 'novos', label: 'Novas (30 dias)' },
  { value: 'inativos', label: 'Inativas (+90 dias)' },
]

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; filtro?: string; pagina?: string }>
}) {
  const context = await requirePermission('clients.view')
  const params = await searchParams
  const canCreate = context.permissions.has('clients.create')
  const filter = (FILTERS.find((item) => item.value === params.filtro)?.value ??
    'todos') as ClientFilter
  const page = Math.max(1, Number(params.pagina ?? 1) || 1)

  const [result, professionals] = await Promise.all([
    listClients(context.tenant.id, { search: params.busca, filter, page }),
    listProfessionals(context.tenant.id),
  ])

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
  }))

  const buildHref = (nextPage: number): string => {
    const query = new URLSearchParams()
    if (params.busca) query.set('busca', params.busca)
    if (filter !== 'todos') query.set('filtro', filter)
    query.set('pagina', String(nextPage))
    return `/clientes?${query.toString()}`
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Histórico, preferências, ficha capilar e retorno previsto."
        actions={
          canCreate ? (
            <>
              <Button asChild variant="outline">
                <Link href="/clientes/importar">
                  <FileUp className="size-4" /> Importar
                </Link>
              </Button>
              <ClientDialog professionals={professionalOptions} />
            </>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Nome, telefone ou e-mail…" />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <Link
              key={item.value}
              href={
                item.value === 'todos' ? '/clientes' : `/clientes?filtro=${item.value}`
              }
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                filter === item.value
                  ? 'border-brand-300 bg-[var(--accent)] text-[var(--accent-foreground)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma cliente encontrada"
          description={
            params.busca
              ? 'Tente outro nome ou telefone.'
              : 'Cadastre a primeira cliente ou importe sua lista atual.'
          }
          action={canCreate ? <ClientDialog professionals={professionalOptions} /> : null}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Contato</TH>
                  <TH className="text-right">Atendimentos</TH>
                  <TH className="text-right">Total gasto</TH>
                  <TH>Última visita</TH>
                </TR>
              </THead>
              <TBody>
                {result.items.map((client) => (
                  <TR key={client.id}>
                    <TD>
                      <Link
                        href={`/clientes/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      {client.daysSinceLastVisit !== null &&
                      client.daysSinceLastVisit > 90 ? (
                        <Badge variant="warning" className="ml-2">
                          Inativa
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {client.whatsapp ?? client.phone ?? client.email ?? '—'}
                    </TD>
                    <TD className="text-right">{client.visits}</TD>
                    <TD className="text-right">{formatCurrency(client.totalSpent)}</TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {client.lastVisitAt
                        ? `${formatDate(client.lastVisitAt, context.tenant.timezone)} · ${
                            client.daysSinceLastVisit
                          } dias`
                        : 'Sem visitas'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        buildHref={buildHref}
      />
    </>
  )
}
