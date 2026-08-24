'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  createWhatsappTemplate,
  sendWhatsappToClient,
  setWhatsappTemplateActive,
  updateWhatsappTemplate,
} from '@/features/whatsapp/service'
import { sendWhatsappMessageSchema, whatsappTemplateSchema } from '@/validators/whatsapp'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text } from './form'

function readTemplateForm(formData: FormData) {
  return whatsappTemplateSchema.safeParse({
    code: text(formData, 'code'),
    name: text(formData, 'name'),
    category: text(formData, 'category') || 'UTILITY',
    body: text(formData, 'body'),
    isActive: checkbox(formData, 'isActive'),
  })
}

export async function createWhatsappTemplateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('whatsapp.manage')
  const parsed = readTemplateForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createWhatsappTemplate(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'whatsapp_template.created',
      entity: 'whatsapp_template',
      entityId: id,
      summary: `Modelo criado: ${parsed.data.name}`,
    })
    revalidatePath('/whatsapp')
    return ok('Modelo criado.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function updateWhatsappTemplateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('whatsapp.manage')
  const templateId = uuidSchema.safeParse(text(formData, 'templateId'))
  if (!templateId.success) return fail(templateId.error)

  const parsed = readTemplateForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await updateWhatsappTemplate(context.tenant.id, templateId.data, parsed.data)
    revalidatePath('/whatsapp')
    return ok('Modelo atualizado.')
  } catch (error) {
    return fail(error)
  }
}

export async function toggleWhatsappTemplateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('whatsapp.manage')
  const parsed = z
    .object({ templateId: uuidSchema, isActive: z.enum(['true', 'false']) })
    .safeParse({
      templateId: text(formData, 'templateId'),
      isActive: text(formData, 'isActive'),
    })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const isActive = parsed.data.isActive === 'true'
    await setWhatsappTemplateActive(context.tenant.id, parsed.data.templateId, isActive)
    revalidatePath('/whatsapp')
    return ok(isActive ? 'Modelo ativado.' : 'Modelo desativado.')
  } catch (error) {
    return fail(error)
  }
}

export async function sendWhatsappMessageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('whatsapp.send')
  const parsed = sendWhatsappMessageSchema.safeParse({
    clientId: text(formData, 'clientId'),
    templateId: text(formData, 'templateId'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await sendWhatsappToClient(context.tenant.id, parsed.data.clientId, parsed.data.templateId)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'whatsapp_message.sent',
      entity: 'whatsapp_message',
      summary: 'Mensagem enviada manualmente',
    })
    revalidatePath('/whatsapp')
    return ok('Mensagem enviada.')
  } catch (error) {
    return fail(error)
  }
}
