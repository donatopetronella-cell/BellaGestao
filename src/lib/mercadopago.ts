import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getEnv } from './env'

/**
 * Payment gateway. Same shape as `whatsapp.ts`/`storage.ts` — a `manual`
 * driver in development (no network, checkout redirects to an internal
 * simulation route) and Mercado Pago's Checkout Pro (`preference`) REST API
 * when `MERCADO_PAGO_ACCESS_TOKEN` is configured. Recurring billing is
 * modelled application-side (one `Payment` per cycle, `Subscription`
 * extended on each confirmed webhook) rather than via Mercado Pago's
 * `preapproval` mandate API, keeping the integration to plain `fetch` calls.
 */
export interface CheckoutPreferenceInput {
  paymentId: string
  planName: string
  billingCycle: 'monthly' | 'yearly'
  amount: number
  currency: string
  payerEmail: string
}

export interface CheckoutPreferenceResult {
  ok: boolean
  checkoutUrl?: string
  preferenceId?: string
  error?: string
}

export interface RemotePaymentDetails {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CHARGEBACK' | 'CANCELED'
  amount: number
  externalReference: string | null
  method: string | null
  paidAt: Date | null
}

export interface PaymentGateway {
  readonly name: 'manual' | 'mercado-pago'
  createCheckoutPreference(input: CheckoutPreferenceInput): Promise<CheckoutPreferenceResult>
  fetchPaymentDetails(paymentId: string): Promise<RemotePaymentDetails>
  verifyWebhookSignature(headers: Headers, rawBody: string): boolean
}

const manualGateway: PaymentGateway = {
  name: 'manual',
  async createCheckoutPreference(input) {
    console.warn(
      `[mercadopago:dev] preferência simulada para pagamento ${input.paymentId} (${input.amount} ${input.currency})`,
    )
    const url = new URL('/api/dev/simulate-payment', getEnv().APP_URL)
    url.searchParams.set('paymentId', input.paymentId)
    return { ok: true, checkoutUrl: url.toString(), preferenceId: `dev-${input.paymentId}` }
  },
  async fetchPaymentDetails() {
    throw new Error('fetchPaymentDetails não se aplica ao driver manual.')
  },
  verifyWebhookSignature() {
    return true
  },
}

const MP_STATUS_MAP: Record<string, RemotePaymentDetails['status']> = {
  pending: 'PENDING',
  in_process: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  refunded: 'REFUNDED',
  charged_back: 'CHARGEBACK',
  cancelled: 'CANCELED',
}

function mercadoPagoGateway(accessToken: string, webhookSecret: string | undefined): PaymentGateway {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  return {
    name: 'mercado-pago',
    async createCheckoutPreference(input) {
      try {
        const appUrl = getEnv().APP_URL
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: [
              {
                title: `Assinatura BellaGestão — ${input.planName} (${
                  input.billingCycle === 'yearly' ? 'anual' : 'mensal'
                })`,
                quantity: 1,
                unit_price: input.amount,
                currency_id: input.currency,
              },
            ],
            payer: { email: input.payerEmail },
            external_reference: input.paymentId,
            back_urls: {
              success: `${appUrl}/configuracoes/assinatura?status=success`,
              failure: `${appUrl}/configuracoes/assinatura?status=failure`,
              pending: `${appUrl}/configuracoes/assinatura?status=pending`,
            },
            auto_return: 'approved',
            notification_url: `${appUrl}/api/webhooks/mercadopago`,
          }),
        })
        const payload = (await response.json()) as {
          id?: string
          init_point?: string
          message?: string
        }
        if (!response.ok) {
          return { ok: false, error: payload.message ?? `HTTP ${response.status}` }
        }
        return { ok: true, checkoutUrl: payload.init_point, preferenceId: payload.id }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Falha ao criar checkout.' }
      }
    },
    async fetchPaymentDetails(paymentId) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers,
      })
      if (!response.ok) {
        throw new Error(`Falha ao consultar pagamento ${paymentId}: HTTP ${response.status}`)
      }
      const payload = (await response.json()) as {
        status?: string
        transaction_amount?: number
        external_reference?: string | null
        payment_method_id?: string | null
        date_approved?: string | null
      }
      return {
        status: MP_STATUS_MAP[payload.status ?? ''] ?? 'PENDING',
        amount: payload.transaction_amount ?? 0,
        externalReference: payload.external_reference ?? null,
        method: payload.payment_method_id ?? null,
        paidAt: payload.date_approved ? new Date(payload.date_approved) : null,
      }
    },
    verifyWebhookSignature(headers, rawBody) {
      if (!webhookSecret) return true

      const signature = headers.get('x-signature')
      const requestId = headers.get('x-request-id')
      if (!signature || !requestId) return false

      const parts = Object.fromEntries(
        signature.split(',').map((part) => {
          const [key, value] = part.split('=').map((s) => s.trim())
          return [key, value] as const
        }),
      )
      const ts = parts.ts
      const v1 = parts.v1
      if (!ts || !v1) return false

      let dataId = ''
      try {
        dataId = (JSON.parse(rawBody) as { data?: { id?: string } }).data?.id ?? ''
      } catch {
        return false
      }

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
      const expected = createHmac('sha256', webhookSecret).update(manifest).digest('hex')

      const expectedBuffer = Buffer.from(expected)
      const receivedBuffer = Buffer.from(v1)
      if (expectedBuffer.length !== receivedBuffer.length) return false
      return timingSafeEqual(expectedBuffer, receivedBuffer)
    },
  }
}

let cachedGateway: PaymentGateway | null = null

export function getPaymentGateway(): PaymentGateway {
  if (cachedGateway) return cachedGateway
  const env = getEnv()
  cachedGateway = env.MERCADO_PAGO_ACCESS_TOKEN
    ? mercadoPagoGateway(env.MERCADO_PAGO_ACCESS_TOKEN, env.MERCADO_PAGO_WEBHOOK_SECRET)
    : manualGateway
  return cachedGateway
}

export function resetPaymentGatewayCache(): void {
  cachedGateway = null
}
