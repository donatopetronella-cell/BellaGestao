import type { Metadata } from 'next'
import { AlertTriangle, Boxes, Package, Warehouse } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { listProductOptions } from '@/features/products/service'
import { getStockSummary, listMovements } from '@/features/inventory/service'
import { StockAdjustmentDialog } from '@/features/inventory/components/stock-adjustment-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { StatCard } from '@/features/dashboard/components/stat-card'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Estoque' }

const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venda',
  SERVICE_USE: 'Uso em serviço',
  ADJUSTMENT: 'Ajuste',
  LOSS: 'Perda',
  RETURN: 'Devolução',
  TRANSFER: 'Transferência',
}

export default async function EstoquePage() {
  const context = await requirePermission('inventory.view')
  const canManage = context.permissions.has('inventory.manage')

  const [summary, products, movements] = await Promise.all([
    getStockSummary(context.tenant.id),
    listProductOptions(context.tenant.id),
    listMovements(context.tenant.id, { take: 50 }),
  ])

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Nível de estoque, alertas de reposição e histórico de movimentações."
        actions={canManage ? <StockAdjustmentDialog products={products} /> : null}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Produtos ativos" value={String(summary.totalProducts)} icon={Package} />
        <StatCard
          label="Abaixo do mínimo"
          value={String(summary.lowStockCount)}
          icon={AlertTriangle}
          tone={summary.lowStockCount > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Valor em estoque (custo)"
          value={formatCurrency(summary.stockValue)}
          icon={Boxes}
        />
      </div>

      {movements.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="Nenhuma movimentação registrada"
          description={
            canManage
              ? 'Registre a entrada inicial dos produtos para começar a controlar o estoque.'
              : 'Ainda não há movimentações de estoque neste salão.'
          }
          action={canManage ? <StockAdjustmentDialog products={products} /> : null}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>Produto</TH>
                  <TH>Tipo</TH>
                  <TH className="text-right">Quantidade</TH>
                  <TH className="text-right">Custo unit.</TH>
                  <TH>Motivo</TH>
                </TR>
              </THead>
              <TBody>
                {movements.map((movement) => (
                  <TR key={movement.id}>
                    <TD className="text-[var(--muted-foreground)]">
                      {formatDate(movement.createdAt)} {formatTime(movement.createdAt)}
                    </TD>
                    <TD className="font-medium">{movement.productName}</TD>
                    <TD>{MOVEMENT_LABELS[movement.type] ?? movement.type}</TD>
                    <TD
                      className={`text-right ${movement.quantity < 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {movement.quantity > 0 ? '+' : ''}
                      {movement.quantity}
                    </TD>
                    <TD className="text-right">
                      {movement.unitCost === null ? '—' : formatCurrency(movement.unitCost)}
                    </TD>
                    <TD className="text-[var(--muted-foreground)]">{movement.reason ?? '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
