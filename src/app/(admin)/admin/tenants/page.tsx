import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Salões · Admin' }

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  TRIAL: 'warning',
  ACTIVE: 'success',
  PAST_DUE: 'danger',
  CANCELED: 'default',
  SUSPENDED: 'danger',
}

export default async function AdminTenantsPage() {
  const tenants = await getAdminDb().tenant.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          plan: { select: { name: true, priceMonthly: true } },
        },
      },
    },
  })

  const mrr = tenants.reduce((sum, tenant) => {
    if (tenant.subscription?.status !== 'ACTIVE') return sum
    return sum + Number(tenant.subscription.plan.priceMonthly)
  }, 0)

  return (
    <>
      <PageHeader
        title="Salões"
        description={`${tenants.length} salão(ões) cadastrados · MRR ativo ${formatCurrency(mrr)}`}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Salão</TH>
                <TH>Status</TH>
                <TH>Plano</TH>
                <TH>Assinatura</TH>
                <TH>Período até</TH>
                <TH>Criado em</TH>
              </TR>
            </THead>
            <TBody>
              {tenants.map((tenant) => (
                <TR key={tenant.id}>
                  <TD>
                    <Link href={`/admin/tenants/${tenant.id}`} className="font-medium hover:underline">
                      {tenant.name}
                    </Link>
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">{tenant.slug}</span>
                  </TD>
                  <TD>
                    <Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'}>{tenant.status}</Badge>
                  </TD>
                  <TD>{tenant.subscription?.plan.name ?? '—'}</TD>
                  <TD>{tenant.subscription?.status ?? '—'}</TD>
                  <TD className="text-[var(--muted-foreground)]">
                    {tenant.subscription?.currentPeriodEnd
                      ? formatDate(tenant.subscription.currentPeriodEnd)
                      : '—'}
                  </TD>
                  <TD className="text-[var(--muted-foreground)]">{formatDate(tenant.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
