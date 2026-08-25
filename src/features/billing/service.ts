import 'server-only'
import { withTenant, getAdminDb } from '@/lib/db'
import { notFound, validationError } from '@/lib/errors'
import { getPaymentGateway, type RemotePaymentDetails } from '@/lib/mercadopago'
import type { PaymentProvider } from '@/generated/prisma/enums'
import type { CheckoutInput } from '@/validators/billing'

function cycleAmount(plan: { priceMonthly: unknown; priceYearly: unknown }, cycle: 'monthly' | 'yearly'): number {
  const value = cycle === 'yearly' ? plan.priceYearly ?? plan.priceMonthly : plan.priceMonthly
  return Number(value)
}

const PROVIDER_BY_GATEWAY: Record<'manual' | 'mercado-pago', PaymentProvider> = {
  manual: 'MANUAL',
  'mercado-pago': 'MERCADO_PAGO',
}

/**
 * Creates a pending `Payment` row, then (outside the transaction, same
 * pattern as campaigns dispatching WhatsApp after commit) asks the gateway
 * for a checkout link. `externalReference` on the gateway side is the
 * `Payment.id` — the webhook resolves the tenant through it, no signed state
 * needed in the URL.
 */
export async function createCheckoutSession(
  tenantId: string,
  input: CheckoutInput,
  payerEmail: string,
): Promise<{ checkoutUrl: string }> {
  const gateway = getPaymentGateway()
  const provider = PROVIDER_BY_GATEWAY[gateway.name]

  const { paymentId, planName, amount, currency } = await withTenant(
    tenantId,
    async (tx) => {
      const plan = await tx.plan.findUnique({ where: { code: input.planCode } })
      if (!plan || !plan.isActive) throw notFound('Plano não encontrado.')

      const subscription = await tx.subscription.findUnique({ where: { tenantId } })
      if (!subscription) throw notFound('Assinatura não encontrada para este salão.')

      const amount = cycleAmount(plan, input.billingCycle)
      if (!(amount > 0)) throw validationError('Plano sem preço configurado.')

      const payment = await tx.payment.create({
        data: {
          tenantId,
          subscriptionId: subscription.id,
          provider,
          amount,
          currency: plan.currency,
          status: 'PENDING',
          payload: { planCode: plan.code, billingCycle: input.billingCycle },
        },
        select: { id: true },
      })

      return {
        paymentId: payment.id,
        planName: plan.name,
        amount,
        currency: plan.currency,
      }
    },
  )

  const result = await gateway.createCheckoutPreference({
    paymentId,
    planName,
    billingCycle: input.billingCycle,
    amount,
    currency,
    payerEmail,
  })

  if (!result.ok || !result.checkoutUrl) {
    await withTenant(tenantId, (tx) =>
      tx.payment.update({ where: { id: paymentId }, data: { status: 'REJECTED' } }).catch(() => undefined),
    ).catch(() => undefined)
    throw validationError(result.error ?? 'Não foi possível iniciar o checkout.')
  }

  return { checkoutUrl: result.checkoutUrl }
}

const CYCLE_MS: Record<'monthly' | 'yearly', number> = {
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
}

/**
 * Applies a confirmed (or otherwise updated) remote payment to the local
 * ledger. Called by the webhook route, once per `Payment`. On `APPROVED`,
 * extends the subscription's current period and lifts the tenant out of
 * TRIAL/PAST_DUE.
 */
export async function applyRemotePayment(paymentId: string, details: RemotePaymentDetails): Promise<void> {
  const adminDb = getAdminDb()
  const payment = await adminDb.payment.findUnique({
    where: { id: paymentId },
    select: { tenantId: true, subscriptionId: true, status: true, payload: true },
  })
  if (!payment) throw notFound('Pagamento não encontrado.')
  if (payment.status === 'APPROVED') return // already applied — idempotent

  const checkoutInfo = (payment.payload ?? {}) as { planCode?: string; billingCycle?: 'monthly' | 'yearly' }

  await withTenant(payment.tenantId, async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: details.status,
        method: details.method,
        paidAt: details.paidAt,
        payload: {
          ...checkoutInfo,
          ...details,
          paidAt: details.paidAt?.toISOString() ?? null,
        } as never,
      },
    })

    if (details.status !== 'APPROVED' || !payment.subscriptionId) return

    const cycle = checkoutInfo.billingCycle === 'yearly' ? 'yearly' : 'monthly'
    const cycleMs = CYCLE_MS[cycle]
    const now = new Date()

    const plan = checkoutInfo.planCode
      ? await tx.plan.findUnique({ where: { code: checkoutInfo.planCode }, select: { id: true } })
      : null

    await tx.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        ...(plan ? { planId: plan.id } : {}),
        status: 'ACTIVE',
        billingCycle: cycle,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + cycleMs),
      },
    })

    await tx.tenant.update({
      where: { id: payment.tenantId },
      data: { status: 'ACTIVE' },
    })
  })
}
