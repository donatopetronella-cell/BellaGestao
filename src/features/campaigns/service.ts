import 'server-only'
import { withTenant, type TenantClient } from '@/lib/db'
import { conflict, notFound, validationError } from '@/lib/errors'
import { dispatchWhatsappMessage } from '@/features/whatsapp/service'
import { renderTemplate } from '@/lib/whatsapp'
import type { CampaignInput } from '@/validators/campaign'

export interface CampaignFilters {
  inactiveDays?: number
  birthdayMonth?: number
}

interface TargetClient {
  id: string
  name: string
  whatsapp: string | null
  phone: string | null
}

/** Resolves which clients a campaign's filters currently match — used for the
 * preview count and, at send time, for the actual target list. Only clients
 * with marketing consent and a phone number are eligible. */
async function resolveTargets(
  tx: TenantClient,
  tenantId: string,
  type: CampaignInput['type'],
  filters: CampaignFilters,
): Promise<TargetClient[]> {
  const hasPhone = { OR: [{ whatsapp: { not: null } }, { phone: { not: null } }] }
  const base = {
    tenantId,
    deletedAt: null as null,
    marketingConsent: true,
    ...hasPhone,
  }

  if (type === 'REACTIVATION') {
    const days = filters.inactiveDays ?? 90
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const rows = await tx.client.findMany({
      where: {
        ...base,
        AND: [{ OR: [{ lastVisitAt: { lt: threshold } }, { lastVisitAt: null }] }],
      },
      select: { id: true, name: true, whatsapp: true, phone: true },
    })
    return rows
  }

  if (type === 'BIRTHDAY') {
    const month = filters.birthdayMonth ?? new Date().getMonth() + 1
    const rows = await tx.client.findMany({
      where: { ...base, birthDate: { not: null } },
      select: { id: true, name: true, whatsapp: true, phone: true, birthDate: true },
    })
    return rows.filter((row) => (row.birthDate?.getUTCMonth() ?? -1) + 1 === month)
  }

  const rows = await tx.client.findMany({
    where: base,
    select: { id: true, name: true, whatsapp: true, phone: true },
  })
  return rows
}

export async function previewCampaignTargets(
  tenantId: string,
  type: CampaignInput['type'],
  filters: CampaignFilters,
): Promise<number> {
  return withTenant(tenantId, async (tx) => {
    const targets = await resolveTargets(tx, tenantId, type, filters)
    return targets.length
  })
}

export interface CampaignListItem {
  id: string
  name: string
  type: string
  status: string
  templateName: string | null
  targetCount: number
  sentCount: number
  scheduledAt: Date | null
  startedAt: Date | null
  finishedAt: Date | null
}

export async function listCampaigns(tenantId: string): Promise<CampaignListItem[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        stats: true,
        scheduledAt: true,
        startedAt: true,
        finishedAt: true,
        template: { select: { name: true } },
        _count: { select: { targets: true } },
      },
    }),
  )
  return rows.map((row) => {
    const stats = row.stats as { sent?: number } | null
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      templateName: row.template?.name ?? null,
      targetCount: row._count.targets,
      sentCount: stats?.sent ?? 0,
      scheduledAt: row.scheduledAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
    }
  })
}

export async function createCampaign(
  tenantId: string,
  input: CampaignInput,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const template = await tx.whatsappTemplate.findFirst({
      where: { id: input.templateId, tenantId, isActive: true },
      select: { id: true },
    })
    if (!template) throw notFound('Modelo não encontrado ou inativo.')

    const campaign = await tx.campaign.create({
      data: {
        tenantId,
        name: input.name,
        type: input.type,
        templateId: input.templateId,
        filters: {
          inactiveDays: input.inactiveDays ?? null,
          birthdayMonth: input.birthdayMonth ?? null,
        },
      },
      select: { id: true },
    })
    return campaign.id
  })
}

/** Resolves targets, creates one WhatsApp message per client and sends right away. */
export async function sendCampaign(tenantId: string, campaignId: string): Promise<number> {
  const { messageIds } = await withTenant(tenantId, async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: campaignId, tenantId },
      select: { id: true, status: true, type: true, filters: true, templateId: true },
    })
    if (!campaign) throw notFound('Campanha não encontrada.')
    if (campaign.status !== 'DRAFT') throw conflict('Esta campanha já foi enviada.')
    if (!campaign.templateId) throw validationError('Selecione um modelo para a campanha.')

    const template = await tx.whatsappTemplate.findFirst({
      where: { id: campaign.templateId, tenantId },
      select: { body: true },
    })
    if (!template) throw notFound('Modelo não encontrado.')

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    const filters = (campaign.filters ?? {}) as CampaignFilters
    const targets = await resolveTargets(tx, tenantId, campaign.type, filters)

    if (targets.length === 0) {
      throw validationError('Nenhuma cliente encontrada para os filtros desta campanha.')
    }

    const messageIds: string[] = []
    for (const target of targets) {
      const toPhone = target.whatsapp || target.phone
      if (!toPhone) continue

      const message = await tx.whatsappMessage.create({
        data: {
          tenantId,
          clientId: target.id,
          campaignId: campaign.id,
          templateId: campaign.templateId,
          toPhone,
          body: renderTemplate(template.body, { cliente: target.name, salao: tenant?.name ?? '' }),
          status: 'QUEUED',
        },
        select: { id: true },
      })
      messageIds.push(message.id)

      await tx.campaignTarget.create({
        data: { tenantId, campaignId: campaign.id, clientId: target.id, messageId: message.id },
      })
    }

    await tx.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    return { messageIds }
  })

  for (const messageId of messageIds) {
    await dispatchWhatsappMessage(tenantId, messageId)
  }

  await withTenant(tenantId, (tx) =>
    tx.campaign.update({
      where: { id: campaignId },
      data: { status: 'FINISHED', finishedAt: new Date(), stats: { sent: messageIds.length } },
    }),
  )

  return messageIds.length
}
