import type { Metadata } from 'next'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import {
  listServiceCategories,
  listServices,
} from '@/features/services/service'
import { listProfessionals } from '@/features/professionals/service'
import { ServiceDialog } from '@/features/services/components/service-dialog'
import { ServiceRowActions } from '@/features/services/components/service-row-actions'
import { CategoryDialog } from '@/features/services/components/category-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Serviços' }

interface PageProps {
  searchParams: Promise<{
    busca?: string
    categoria?: string
    inativos?: string
    pagina?: string
  }>
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const context = await requirePermission('services.view')
  const params = await searchParams
  const canManage = context.permissions.has('services.manage')
  const page = Math.max(1, Number(params.pagina ?? 1) || 1)
  const includeInactive = params.inativos === '1'

  const [result, categories, professionals] = await Promise.all([
    listServices(context.tenant.id, {
      search: params.busca,
      categoryId: params.categoria ?? null,
      includeInactive,
      page,
    }),
    listServiceCategories(context.tenant.id),
    listProfessionals(context.tenant.id),
  ])

  const options = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
  }))
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }))

  const buildHref = (nextPage: number): string => {
    const query = new URLSearchParams()
    if (params.busca) query.set('busca', params.busca)
    if (params.categoria) query.set('categoria', params.categoria)
    if (includeInactive) query.set('inativos', '1')
    query.set('pagina', String(nextPage))
    return `/servicos?${query.toString()}`
  }

  return (
    <>
      <PageHeader
        title="Serviços"
        description="Catálogo, duração, preços, comissão e profissionais habilitados."
        actions={
          canManage ? (
            <>
              <CategoryDialog />
              <ServiceDialog categories={categoryOptions} professionals={options} />
            </>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar serviço…" />
        <div className="flex flex-wrap gap-1">
          <FilterChip href="/servicos" active={!params.categoria}>
            Todas
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              href={`/servicos?categoria=${category.id}`}
              active={params.categoria === category.id}
            >
              {category.name} ({category.serviceCount})
            </FilterChip>
          ))}
        </div>
        <FilterChip
          href={includeInactive ? '/servicos' : '/servicos?inativos=1'}
          active={includeInactive}
          className="ml-auto"
        >
          Mostrar inativos
        </FilterChip>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum serviço encontrado"
          description={
            canManage
              ? 'Cadastre os serviços do salão para começar a agendar.'
              : 'Peça a quem administra o salão para cadastrar os serviços.'
          }
          action={
            canManage ? (
              <ServiceDialog categories={categoryOptions} professionals={options} />
            ) : null
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Serviço</TH>
                  <TH>Categoria</TH>
                  <TH className="text-right">Duração</TH>
                  <TH className="text-right">Preço</TH>
                  <TH className="text-right">Comissão</TH>
                  <TH>Profissionais</TH>
                  {canManage ? <TH className="text-right">Ações</TH> : null}
                </TR>
              </THead>
              <TBody>
                {result.items.map((service) => (
                  <TR key={service.id}>
                    <TD>
                      <span className="font-medium">{service.name}</span>
                      {!service.isActive ? (
                        <Badge variant="outline" className="ml-2">
                          Inativo
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {service.categoryName ?? '—'}
                    </TD>
                    <TD className="text-right">{service.durationMinutes} min</TD>
                    <TD className="text-right">{formatCurrency(service.price)}</TD>
                    <TD className="text-right">
                      {service.commissionValue === 0
                        ? 'Padrão'
                        : service.commissionKind === 'PERCENT'
                          ? `${service.commissionValue}%`
                          : formatCurrency(service.commissionValue)}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {service.professionals.length === 0
                        ? 'Todos'
                        : service.professionals.map((item) => item.name).join(', ')}
                    </TD>
                    {canManage ? (
                      <TD>
                        <ServiceRowActions
                          service={service}
                          categories={categoryOptions}
                          professionals={options}
                        />
                      </TD>
                    ) : null}
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

function FilterChip({
  href,
  active,
  className,
  children,
}: {
  href: string
  active: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'border-brand-300 bg-[var(--accent)] text-[var(--accent-foreground)]'
          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
      } ${className ?? ''}`}
    >
      {children}
    </Link>
  )
}
