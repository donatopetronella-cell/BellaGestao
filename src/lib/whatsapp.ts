import 'server-only'
import { getEnv } from './env'

/**
 * WhatsApp sender. Two drivers, same shape as `storage.ts` — a `console`
 * driver in development (writes to the queued message row, never touches the
 * network) and the real WhatsApp Cloud API when `WHATSAPP_ACCESS_TOKEN` and
 * `WHATSAPP_PHONE_NUMBER_ID` are configured.
 */
export interface WhatsappSendResult {
  ok: boolean
  providerMessageId?: string
  error?: string
}

export interface WhatsappSender {
  readonly name: 'console' | 'cloud-api'
  send(toPhone: string, body: string): Promise<WhatsappSendResult>
}

const consoleSender: WhatsappSender = {
  name: 'console',
  async send(toPhone, body) {
    console.warn(`[whatsapp:dev] → ${toPhone}\n${body}`)
    return { ok: true, providerMessageId: `dev-${Date.now()}` }
  },
}

function cloudApiSender(accessToken: string, phoneNumberId: string): WhatsappSender {
  return {
    name: 'cloud-api',
    async send(toPhone, body) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: toPhone.replace(/\D/g, ''),
              type: 'text',
              text: { body },
            }),
          },
        )
        const payload = (await response.json()) as {
          messages?: Array<{ id: string }>
          error?: { message?: string }
        }
        if (!response.ok) {
          return { ok: false, error: payload.error?.message ?? `HTTP ${response.status}` }
        }
        return { ok: true, providerMessageId: payload.messages?.[0]?.id }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Falha no envio.' }
      }
    },
  }
}

let cachedSender: WhatsappSender | null = null

export function getWhatsappSender(): WhatsappSender {
  if (cachedSender) return cachedSender
  const env = getEnv()
  cachedSender =
    env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID
      ? cloudApiSender(env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID)
      : consoleSender
  return cachedSender
}

export function resetWhatsappSenderCache(): void {
  cachedSender = null
}

/** Fills `{{variable}}` placeholders from a template body. */
export function renderTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => variables[key] ?? match)
}
