import { NextResponse, type NextRequest } from 'next/server'
import { getAdminDb } from '@/lib/db'
import { getPaymentGateway } from '@/lib/mercadopago'
import { applyRemotePayment } from '@/features/billing/service'

interface MpWebhookPayload {
  type?: string
  action?: string
  data?: { id?: string }
}

/**
 * Mercado Pago notification webhook. Every event is recorded in
 * `WebhookEvent` before processing (durable receipt, dedupe key
 * `[provider, eventId]`), then the payment is fetched from Mercado Pago
 * directly — the notification body never carries amount/status reliably.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const raw = await request.text()
  const gateway = getPaymentGateway()

  if (!gateway.verifyWebhookSignature(request.headers, raw)) {
    return new Response('Forbidden', { status: 401 })
  }

  let payload: MpWebhookPayload | null = null
  try {
    payload = JSON.parse(raw) as MpWebhookPayload
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (payload.type !== 'payment' || !payload.data?.id) {
    return NextResponse.json({ ok: true })
  }

  const eventId = payload.data.id
  const adminDb = getAdminDb()

  const existing = await adminDb.webhookEvent.findUnique({
    where: { provider_eventId: { provider: 'MERCADO_PAGO', eventId } },
    select: { processedAt: true },
  })
  if (existing?.processedAt) {
    return NextResponse.json({ ok: true })
  }

  if (!existing) {
    await adminDb.webhookEvent.create({
      data: {
        provider: 'MERCADO_PAGO',
        eventId,
        type: payload.type,
        payload: payload as never,
      },
    })
  }

  let error: string | null = null
  try {
    const details = await gateway.fetchPaymentDetails(eventId)
    if (details.externalReference) {
      await applyRemotePayment(details.externalReference, details)
    } else {
      error = 'Pagamento sem external_reference — não foi possível associar a um tenant.'
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Falha ao processar o webhook.'
  }

  await adminDb.webhookEvent.update({
    where: { provider_eventId: { provider: 'MERCADO_PAGO', eventId } },
    data: { processedAt: new Date(), error },
  })

  return NextResponse.json({ ok: true })
}
