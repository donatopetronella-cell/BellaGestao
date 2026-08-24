import 'server-only'
import { withTenant } from '@/lib/db'
import { conflict, notFound, validationError } from '@/lib/errors'
import { getWhatsappSender, renderTemplate } from '@/lib/whatsapp'
import type { WhatsappTemplateInput } from '@/validators/whatsapp'

export interface WhatsappTemplateItem {
  id: string
  code: string
  name: string
  category: string
  body: string
  variables: string[]
  isActive: boolean
  messageCount: number
}

export async function listWhatsappTemplates(
  tenantId: string,
): Promise<WhatsappTemplateItem[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.whatsappTemplate.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        body: true,
        variables: true,
        isActive: true,
        _count: { select: { messages: true } },
      },
    }),
  )
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    body: row.body,
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    isActive: row.isActive,
    messageCount: row._count.messages,
  }))
}

/** `{{variable}}` placeholders found in the body, in order of first use. */
function extractVariables(body: string): string[] {
  const found: string[] = []
  for (const match of body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    const key = match[1]
    if (key && !found.includes(key)) found.push(key)
  }
  return found
}

export async function createWhatsappTemplate(
  tenantId: string,
  input: WhatsappTemplateInput,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const duplicate = await tx.whatsappTemplate.findFirst({
      where: { tenantId, code: input.code },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe um modelo com este código.')

    const template = await tx.whatsappTemplate.create({
      data: {
        tenantId,
        code: input.code,
        name: input.name,
        category: input.category,
        body: input.body,
        variables: extractVariables(input.body),
        isActive: input.isActive,
      },
      select: { id: true },
    })
    return template.id
  })
}

export async function updateWhatsappTemplate(
  tenantId: string,
  templateId: string,
  input: WhatsappTemplateInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const existing = await tx.whatsappTemplate.findFirst({
      where: { id: templateId, tenantId },
      select: { id: true },
    })
    if (!existing) throw notFound('Modelo não encontrado.')

    const duplicate = await tx.whatsappTemplate.findFirst({
      where: { tenantId, code: input.code, id: { not: templateId } },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe um modelo com este código.')

    await tx.whatsappTemplate.update({
      where: { id: templateId },
      data: {
        code: input.code,
        name: input.name,
        category: input.category,
        body: input.body,
        variables: extractVariables(input.body),
        isActive: input.isActive,
      },
    })
  })
}

export async function setWhatsappTemplateActive(
  tenantId: string,
  templateId: string,
  isActive: boolean,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const result = await tx.whatsappTemplate.updateMany({
      where: { id: templateId, tenantId },
      data: { isActive },
    })
    if (result.count === 0) throw notFound('Modelo não encontrado.')
  })
}

export interface WhatsappMessageItem {
  id: string
  toPhone: string
  clientName: string | null
  templateName: string | null
  body: string
  direction: string
  status: string
  error: string | null
  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null
  createdAt: Date
}

export interface WhatsappMessageListResult {
  items: WhatsappMessageItem[]
  total: number
  page: number
  perPage: number
}

export async function listWhatsappMessages(
  tenantId: string,
  options: { page?: number; perPage?: number } = {},
): Promise<WhatsappMessageListResult> {
  const page = Math.max(1, options.page ?? 1)
  const perPage = Math.min(100, options.perPage ?? 20)

  return withTenant(tenantId, async (tx) => {
    const where = { tenantId }
    const total = await tx.whatsappMessage.count({ where })
    const rows = await tx.whatsappMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        toPhone: true,
        body: true,
        direction: true,
        status: true,
        error: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        createdAt: true,
        client: { select: { name: true } },
        template: { select: { name: true } },
      },
    })

    return {
      total,
      page,
      perPage,
      items: rows.map((row) => ({
        id: row.id,
        toPhone: row.toPhone,
        clientName: row.client?.name ?? null,
        templateName: row.template?.name ?? null,
        body: row.body,
        direction: row.direction,
        status: row.status,
        error: row.error,
        sentAt: row.sentAt,
        deliveredAt: row.deliveredAt,
        readAt: row.readAt,
        createdAt: row.createdAt,
      })),
    }
  })
}

/** Renders the template for the client, queues the row and sends it right away. */
export async function sendWhatsappToClient(
  tenantId: string,
  clientId: string,
  templateId: string,
): Promise<string> {
  const messageId = await withTenant(tenantId, async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
      select: { id: true, name: true, whatsapp: true, phone: true },
    })
    if (!client) throw notFound('Cliente não encontrada.')
    const toPhone = client.whatsapp || client.phone
    if (!toPhone) throw validationError('Esta cliente não tem telefone cadastrado.')

    const template = await tx.whatsappTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
      select: { id: true, body: true },
    })
    if (!template) throw notFound('Modelo não encontrado ou inativo.')

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    const body = renderTemplate(template.body, { cliente: client.name, salao: tenant?.name ?? '' })

    const message = await tx.whatsappMessage.create({
      data: {
        tenantId,
        clientId: client.id,
        templateId: template.id,
        toPhone,
        body,
        status: 'QUEUED',
      },
      select: { id: true },
    })
    return message.id
  })

  await dispatchWhatsappMessage(tenantId, messageId)
  return messageId
}

/** Sends a queued message through the configured driver and records the outcome. */
export async function dispatchWhatsappMessage(
  tenantId: string,
  messageId: string,
): Promise<void> {
  const message = await withTenant(tenantId, (tx) =>
    tx.whatsappMessage.findFirst({
      where: { id: messageId, tenantId },
      select: { id: true, toPhone: true, body: true },
    }),
  )
  if (!message) throw notFound('Mensagem não encontrada.')

  const result = await getWhatsappSender().send(message.toPhone, message.body)

  await withTenant(tenantId, (tx) =>
    tx.whatsappMessage.update({
      where: { id: message.id },
      data: result.ok
        ? { status: 'SENT', sentAt: new Date(), providerMessageId: result.providerMessageId }
        : { status: 'FAILED', error: result.error ?? 'Falha no envio.' },
    }),
  )
}
