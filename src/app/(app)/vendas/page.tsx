import type { Metadata } from 'next'
import { ShoppingBag } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { listSales } from '@/features/sales/service'
import { listProductOptions } from '@/features/products/service'
import { listServiceOptions } from '@/features/services/service'
import { listProfessionals } from '@/features/professionals/service'
import { SaleDialog } from '@/features/sales/components/sale-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Vendas' }

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  PAID: 'Paga',
  CANCELED: 'Cancelada',
}

interface PageProps {
  searchParams: Promise<{ pagina?: string }>
}

export default async function VendasPage({ searchParams }: PageProps) {
  const context = await requirePermission('sales.view')
  const params = await searchParams
  const canCreate = context.permissions.has('sales.create')
  const page = Math.max(1, Number(params.pagina ?? 1) || 1)

  const [result, products, services, professionals] = await Promise.all([
    listSales(context.tenant.id, { page }),
    canCreate ? listProductOptions(context.tenant.id) : Promise.resolve([]),
    canCreate ? listServiceOptions(context.tenant.id) : Promise.resolve([]),
    canCreate ? listProfessionals(context.tenant.id) : Promise.resolve([]),
  ])

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
  }))

  return (
    <>
      <PageHeader
        title="Vendas"
        description="PDV para produtos e serviços avulsos, com baixa automática de estoque."
        actions={
          canCreate ? (
            <SaleDialog products={products} services={services} professionals={professionalOptions} />
          ) : null
        }
      />

      {result.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhuma venda registrada"
          description="Registre a primeira venda avulsa de produto ou serviço."
          action={
            canCreate ? (
              <SaleDialog
                products={products}
                services={services}
                professionals={professionalOptions}
              />
            ) : null
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Data</TH>
                  <TH>Cliente</TH>
                  <TH>Itens</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {result.items.map((sale) => (
                  <TR key={sale.id}>
                    <TD className="font-medium">#{sale.number}</TD>
                    <TD className="text-[var(--muted-foreground)]">
                      {formatDate(sale.soldAt)} {formatTime(sale.soldAt)}
                    </TD>
                    <TD>{sale.clientName ?? '—'}</TD>
                    <TD className="max-w-xs truncate text-[var(--muted-foreground)]">
                      {sale.itemsSummary}
                    </TD>
                    <TD className="text-right font-medium">{formatCurrency(sale.total)}</TD>
                    <TD>
                      <Badge variant={sale.status === 'CANCELED' ? 'danger' : 'success'}>
                        {STATUS_LABELS[sale.status]}
                      </Badge>
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
        buildHref={(nextPage) => `/vendas?pagina=${nextPage}`}
      />
    </>
  )
}
