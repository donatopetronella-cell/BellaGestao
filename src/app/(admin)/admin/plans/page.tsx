import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminDb } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Planos · Admin' }

export default async function AdminPlansPage() {
  const plans = await getAdminDb().plan.findMany({ orderBy: { sortOrder: 'asc' } })

  return (
    <>
      <PageHeader title="Planos" description="Preços, limites e recursos de cada plano." />

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Plano</TH>
                <TH>Mensal</TH>
                <TH>Anual</TH>
                <TH>Trial</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {plans.map((plan) => (
                <TR key={plan.id}>
                  <TD>
                    <Link href={`/admin/plans/${plan.id}`} className="font-medium hover:underline">
                      {plan.name}
                    </Link>
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">{plan.code}</span>
                  </TD>
                  <TD>{formatCurrency(Number(plan.priceMonthly), plan.currency)}</TD>
                  <TD>{plan.priceYearly ? formatCurrency(Number(plan.priceYearly), plan.currency) : '—'}</TD>
                  <TD>{plan.trialDays} dia(s)</TD>
                  <TD>
                    <Badge variant={plan.isActive ? 'success' : 'outline'}>
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
