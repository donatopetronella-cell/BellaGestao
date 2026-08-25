import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPaymentGateway, resetPaymentGatewayCache } from '@/lib/mercadopago'
import { createCheckoutSession, applyRemotePayment } from '@/features/billing/service'
import { assertPlatformAdmin } from '@/lib/auth/context'
import { AppError } from '@/lib/errors'
import { getAdminDb, disconnectDb } from '@/lib/db'
import { resetEnvCache } from '@/lib/env'
import { createTestTenant, destroyTestTenant, type TestTenant } from './helpers'

describe('billing', () => {
  let tenant: TestTenant

  beforeAll(async () => {
    tenant = await createTestTenant('billing')
  })

  afterAll(async () => {
    await destroyTestTenant(tenant)
    await disconnectDb()
  })

  beforeEach(() => {
    resetPaymentGatewayCache()
    resetEnvCache()
  })

  afterEach(() => {
    resetPaymentGatewayCache()
    resetEnvCache()
  })

  it('usa o driver manual quando não há MERCADO_PAGO_ACCESS_TOKEN', () => {
    expect(getPaymentGateway().name).toBe('manual')
  })

  it('cria um pagamento pendente e devolve o link de checkout', async () => {
    const db = getAdminDb()
    const plan = await db.plan.findFirst({ where: { subscriptions: { some: { tenantId: tenant.tenantId } } } })
    if (!plan) throw new Error('plano de teste não encontrado')

    const { checkoutUrl } = await createCheckoutSession(
      tenant.tenantId,
      { planCode: plan.code, billingCycle: 'monthly' },
      'dona@example.test',
    )
    expect(checkoutUrl).toContain('/api/dev/simulate-payment')

    const payment = await db.payment.findFirst({
      where: { tenantId: tenant.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    expect(payment?.status).toBe('PENDING')
  })

  it('aplicar o mesmo pagamento aprovado duas vezes é idempotente', async () => {
    const db = getAdminDb()
    const plan = await db.plan.findFirst({ where: { subscriptions: { some: { tenantId: tenant.tenantId } } } })
    if (!plan) throw new Error('plano de teste não encontrado')

    const { checkoutUrl } = await createCheckoutSession(
      tenant.tenantId,
      { planCode: plan.code, billingCycle: 'monthly' },
      'dona@example.test',
    )
    const paymentId = new URL(checkoutUrl).searchParams.get('paymentId')!

    const details = {
      status: 'APPROVED' as const,
      amount: Number(plan.priceMonthly),
      externalReference: paymentId,
      method: 'manual',
      paidAt: new Date(),
    }

    await applyRemotePayment(paymentId, details)
    const firstPeriodEnd = (
      await db.subscription.findUnique({ where: { tenantId: tenant.tenantId } })
    )?.currentPeriodEnd

    await applyRemotePayment(paymentId, details)
    const secondPeriodEnd = (
      await db.subscription.findUnique({ where: { tenantId: tenant.tenantId } })
    )?.currentPeriodEnd

    expect(secondPeriodEnd?.getTime()).toBe(firstPeriodEnd?.getTime())
  })

  it('assertPlatformAdmin rejeita usuário comum e aceita admin', () => {
    expect(() => assertPlatformAdmin({ user: { isPlatformAdmin: false } as never })).toThrow(AppError)
    expect(() => assertPlatformAdmin({ user: { isPlatformAdmin: true } as never })).not.toThrow()
  })
})
