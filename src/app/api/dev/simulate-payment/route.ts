import { NextResponse, type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/db'
import { getPaymentGateway } from '@/lib/mercadopago'
import { applyRemotePayment } from '@/features/billing/service'
import { getEnv } from '@/lib/env'

/**
 * Dev-only stand-in for Mercado Pago's hosted checkout. Only reachable when
 * the payment gateway is the `manual` driver (no `MERCADO_PAGO_ACCESS_TOKEN`
 * configured) — lets the checkout flow be exercised end to end locally
 * without real credentials.
 */
export async function GET(request: NextRequest): Promise<Response> {
  if (getPaymentGateway().name !== 'manual') {
    return new Response('Not found', { status: 404 })
  }

  const paymentId = request.nextUrl.searchParams.get('paymentId')
  if (!paymentId) return new Response('Missing paymentId', { status: 400 })

  const payment = await getAdminDb().payment.findUnique({
    where: { id: paymentId },
    select: { amount: true },
  })
  if (!payment) return new Response('Payment not found', { status: 404 })

  await applyRemotePayment(paymentId, {
    status: 'APPROVED',
    amount: Number(payment.amount),
    externalReference: paymentId,
    method: 'manual',
    paidAt: new Date(),
  })

  return NextResponse.redirect(new URL('/configuracoes/assinatura?status=success', getEnv().APP_URL))
}
