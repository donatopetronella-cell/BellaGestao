import { NextResponse, type NextRequest } from 'next/server'
import { getAdminDb, withTenant } from '@/lib/db'
import { getEnv } from '@/lib/env'

/**
 * WhatsApp Cloud API webhook. `GET` handles Meta's subscription handshake;
 * `POST` receives delivery/read status updates and inbound replies.
 *
 * One number for the whole platform today (`WHATSAPP_PHONE_NUMBER_ID`), so
 * inbound events are matched back to a tenant by `providerMessageId` (status
 * updates) or by an existing client phone (inbound text) — best effort until
 * each tenant has its own WhatsApp number.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const env = getEnv()
  if (mode === 'subscribe' && token && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

interface StatusEntry {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  errors?: Array<{ title?: string }>
}

interface MessageEntry {
  from: string
  id: string
  text?: { body: string }
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: StatusEntry[]
        messages?: MessageEntry[]
      }
    }>
  }>
}

const STATUS_MAP: Record<StatusEntry['status'], 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
}

export async function POST(request: NextRequest): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as WebhookPayload | null
  if (!payload) return NextResponse.json({ ok: true })

  const adminDb = getAdminDb()

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const message = await adminDb.whatsappMessage.findFirst({
          where: { providerMessageId: status.id },
          select: { id: true, tenantId: true },
        })
        if (!message) continue

        const mapped = STATUS_MAP[status.status]
        await withTenant(message.tenantId, (tx) =>
          tx.whatsappMessage.update({
            where: { id: message.id },
            data: {
              status: mapped,
              ...(mapped === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
              ...(mapped === 'READ' ? { readAt: new Date() } : {}),
              ...(mapped === 'FAILED' ? { error: status.errors?.[0]?.title ?? 'Falha' } : {}),
            },
          }),
        )
      }

      for (const inbound of change.value?.messages ?? []) {
        const client = await adminDb.client.findFirst({
          where: { OR: [{ phone: inbound.from }, { whatsapp: inbound.from }], deletedAt: null },
          select: { id: true, tenantId: true },
        })
        if (!client) continue

        await withTenant(client.tenantId, (tx) =>
          tx.whatsappMessage.create({
            data: {
              tenantId: client.tenantId,
              clientId: client.id,
              toPhone: inbound.from,
              direction: 'INBOUND',
              body: inbound.text?.body ?? '',
              status: 'DELIVERED',
              providerMessageId: inbound.id,
            },
          }),
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
