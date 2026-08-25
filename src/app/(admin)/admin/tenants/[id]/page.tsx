import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdminDb } from '@/lib/db'
import { SubscriptionOverrideForm } from '@/features/billing/components/subscription-override-form'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Salão · Admin' }

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminDb = getAdminDb()

  const tenant = await adminDb.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscription: { select: { status: true, plan: { select: { name: true, code: true } } } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, status: true, amount: true, currency: true, method: true, createdAt: true, paidAt: true },
      },
    },
  })
  if (!tenant) notFound()

  return (
    <>
      <PageHeader
        title={tenant.name}
        description={`${tenant.slug} · Plano ${tenant.subscription?.plan.name ?? '—'}`}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tenant.payments.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted-foreground)]">Nenhum pagamento registrado.</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Status</TH>
                    <TH>Valor</TH>
                    <TH>Método</TH>
                    <TH>Criado em</TH>
                    <TH>Pago em</TH>
                  </TR>
                </THead>
                <TBody>
                  {tenant.payments.map((payment) => (
                    <TR key={payment.id}>
                      <TD>
                        <Badge variant={payment.status === 'APPROVED' ? 'success' : 'outline'}>
                          {payment.status}
                        </Badge>
                      </TD>
                      <TD>{formatCurrency(Number(payment.amount), payment.currency)}</TD>
                      <TD className="text-[var(--muted-foreground)]">{payment.method ?? '—'}</TD>
                      <TD className="text-[var(--muted-foreground)]">{formatDateTime(payment.createdAt)}</TD>
                      <TD className="text-[var(--muted-foreground)]">
                        {payment.paidAt ? formatDateTime(payment.paidAt) : '—'}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar status manualmente</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscriptionOverrideForm
              tenantId={tenant.id}
              currentStatus={tenant.subscription?.status ?? 'TRIAL'}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
