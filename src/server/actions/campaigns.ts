'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import { createCampaign, previewCampaignTargets, sendCampaign } from '@/features/campaigns/service'
import { campaignSchema } from '@/validators/campaign'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import { fail, fromZod, ok, text } from './form'

export async function createCampaignAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('marketing.manage')
  const parsed = campaignSchema.safeParse({
    name: text(formData, 'name'),
    type: text(formData, 'type') || 'CUSTOM',
    templateId: text(formData, 'templateId'),
    inactiveDays: text(formData, 'inactiveDays') || undefined,
    birthdayMonth: text(formData, 'birthdayMonth') || undefined,
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createCampaign(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'campaign.created',
      entity: 'campaign',
      entityId: id,
      summary: `Campanha criada: ${parsed.data.name}`,
    })
    revalidatePath('/marketing')
    return ok('Campanha criada.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function sendCampaignAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('marketing.manage')
  const campaignId = uuidSchema.safeParse(text(formData, 'campaignId'))
  if (!campaignId.success) return fail(campaignId.error)

  try {
    const sent = await sendCampaign(context.tenant.id, campaignId.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'campaign.sent',
      entity: 'campaign',
      entityId: campaignId.data,
      summary: `${sent} mensagens enviadas`,
    })
    revalidatePath('/marketing')
    return ok(`Campanha enviada para ${sent} cliente(s).`)
  } catch (error) {
    return fail(error)
  }
}

export async function previewCampaignTargetsAction(
  type: 'REACTIVATION' | 'BIRTHDAY' | 'PROMOTION' | 'REMINDER' | 'CUSTOM',
  inactiveDays?: number,
  birthdayMonth?: number,
): Promise<number> {
  const context = await requirePermission('marketing.view')
  return previewCampaignTargets(context.tenant.id, type, { inactiveDays, birthdayMonth })
}
