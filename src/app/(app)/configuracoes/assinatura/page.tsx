import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { getTenantSubscription, listPublicPlans } from '@/features/billing/queries'
import { CheckoutButton } from '@/features/billing/components/checkout-button'
import { PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Assinatura' }

const STATUS_BANNER: Record<string, { variant: 'success' | 'info' | 'error'; text: string }> = {
  success: { variant: 'success', text: 'Pagamento confirmado! Sua assinatura foi atualizada.' },
  pending: { variant: 'info', text: 'Pagamento em processamento. Assim que for aprovado, atualizamos aqui.' },
  failure: { variant: 'error', text: 'O pagamento não foi concluído. Tente novamente.' },
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const context = await requirePermission('billing.view')
  const canManage = context.permissions.has('billing.manage')
  const { status } = await searchParams
  const banner = status ? STATUS_BANNER[status] : undefined

  const [subscription, plans] = await Promise.all([
    getTenantSubscription(context.tenant.id),
    listPublicPlans(),
  ])

  return (
    <>
      <PageHeader
        title="Assinatura"
        description="Plano atual, período de teste e opções disponíveis."
      />

      {banner ? (
        <Alert variant={banner.variant} className="mb-6">
          {banner.text}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plano {subscription?.planName ?? '—'}
            {subscription?.status === 'TRIAL' ? (
              <Badge variant="warning">Em teste</Badge>
            ) : (
              <Badge variant="success">Ativo</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {subscription?.trialEndsAt
              ? `Teste até ${formatDate(subscription.trialEndsAt, context.tenant.timezone)} · ${
                  subscription.daysLeftInTrial ?? 0
                } dia(s) restantes`
              : 'Assinatura recorrente.'}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.code === subscription?.planCode
          return (
            <Card key={plan.code} className={current ? 'border-brand-400' : undefined}>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl">{plan.name}</h2>
                  {current ? <Badge variant="brand">Plano atual</Badge> : null}
                </div>
                <p className="font-display text-3xl">
                  {formatCurrency(plan.priceMonthly)}
                  <span className="text-base text-[var(--muted-foreground)]">/mês</span>
                </p>
                <ul className="space-y-2 text-sm">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {highlight}
                    </li>
                  ))}
                </ul>
                {canManage ? <CheckoutButton planCode={plan.code} current={current} /> : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
