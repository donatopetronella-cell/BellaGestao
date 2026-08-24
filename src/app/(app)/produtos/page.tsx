import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import {
  listProductCategories,
  listProducts,
  listSuppliers,
} from '@/features/products/service'
import { ProductDialog } from '@/features/products/components/product-dialog'
import { ProductRowActions } from '@/features/products/components/product-row-actions'
import { CategoryDialog } from '@/features/products/components/category-dialog'
import { SupplierDialog } from '@/features/products/components/supplier-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { SearchInput } from '@/components/ui/search-input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Produtos' }

interface PageProps {
  searchParams: Promise<{
    busca?: string
    categoria?: string
    inativos?: string
    pagina?: string
  }>
}

export default async function ProdutosPage({ searchParams }: PageProps) {
  const context = await requirePermission('products.view')
  const params = await searchParams
  const canManage = context.permissions.has('products.manage')
  const page = Math.max(1, Number(params.pagina ?? 1) || 1)
  const includeInactive = params.inativos === '1'

  const [result, categories, suppliers] = await Promise.all([
    listProducts(context.tenant.id, {
      search: params.busca,
      categoryId: params.categoria ?? null,
      includeInactive,
      page,
    }),
    listProductCategories(context.tenant.id),
    listSuppliers(context.tenant.id),
  ])

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }))
  const supplierOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }))

  const buildHref = (nextPage: number): string => {
    const query = new URLSearchParams()
    if (params.busca) query.set('busca', params.busca)
    if (params.categoria) query.set('categoria', params.categoria)
    if (includeInactive) query.set('inativos', '1')
    query.set('pagina', String(nextPage))
    return `/produtos?${query.toString()}`
  }

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Catálogo, custo, preço de venda e estoque mínimo."
        actions={
          canManage ? (
            <>
              <SupplierDialog />
              <CategoryDialog />
              <ProductDialog categories={categoryOptions} suppliers={supplierOptions} />
            </>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar produto…" />
        <div className="flex flex-wrap gap-1">
          <FilterChip href="/produtos" active={!params.categoria}>
            Todos
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              href={`/produtos?categoria=${category.id}`}
              active={params.categoria === category.id}
            >
              {category.name} ({category.productCount})
            </FilterChip>
          ))}
        </div>
        <FilterChip
          href={includeInactive ? '/produtos' : '/produtos?inativos=1'}
          active={includeInactive}
          className="ml-auto"
        >
          Mostrar inativos
        </FilterChip>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto encontrado"
          description={
            canManage
              ? 'Cadastre os produtos vendidos e os insumos usados nos serviços.'
              : 'Peça a quem administra o salão para cadastrar os produtos.'
          }
          action={
            canManage ? (
              <ProductDialog categories={categoryOptions} suppliers={supplierOptions} />
            ) : null
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Produto</TH>
                  <TH>Categoria</TH>
                  <TH>Fornecedor</TH>
                  <TH className="text-right">Custo</TH>
                  <TH className="text-right">Preço</TH>
                  <TH className="text-right">Estoque</TH>
                  {canManage ? <TH className="text-right">Ações</TH> : null}
                </TR>
              </THead>
              <TBody>
                {result.items.map((product) => {
                  const low = product.minStock > 0 && product.stock <= product.minStock
                  return (
                    <TR key={product.id}>
                      <TD>
                        <span className="font-medium">{product.name}</span>
                        {product.brand ? (
                          <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                            {product.brand}
                          </span>
                        ) : null}
                        {!product.isActive ? (
                          <Badge variant="outline" className="ml-2">
                            Inativo
                          </Badge>
                        ) : null}
                      </TD>
                      <TD className="text-[var(--muted-foreground)]">
                        {product.categoryName ?? '—'}
                      </TD>
                      <TD className="text-[var(--muted-foreground)]">
                        {product.supplierName ?? '—'}
                      </TD>
                      <TD className="text-right">{formatCurrency(product.cost)}</TD>
                      <TD className="text-right">{formatCurrency(product.price)}</TD>
                      <TD className="text-right">
                        <span className={low ? 'text-danger font-medium' : undefined}>
                          {product.stock} {product.unit}
                        </span>
                      </TD>
                      {canManage ? (
                        <TD>
                          <ProductRowActions
                            product={product}
                            categories={categoryOptions}
                            suppliers={supplierOptions}
                          />
                        </TD>
                      ) : null}
                    </TR>
                  )
                })}
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
