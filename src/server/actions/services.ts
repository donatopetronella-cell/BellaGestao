'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  archiveService,
  createService,
  createServiceCategory,
  setServiceActive,
  updateService,
} from '@/features/services/service'
import { serviceCategorySchema, serviceSchema } from '@/validators/service'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text, textList } from './form'

function readServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: text(formData, 'name'),
    categoryId: text(formData, 'categoryId'),
    description: text(formData, 'description'),
    durationMinutes: text(formData, 'durationMinutes'),
    price: text(formData, 'price'),
    cost: text(formData, 'cost') || 0,
    commissionKind: text(formData, 'commissionKind') || 'PERCENT',
    commissionValue: text(formData, 'commissionValue') || 0,
    isActive: checkbox(formData, 'isActive'),
    professionalIds: textList(formData, 'professionalIds'),
  })
}

export async function createServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('services.manage')
  const parsed = readServiceForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const serviceId = await createService(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'service.created',
      entity: 'service',
      entityId: serviceId,
      summary: `Serviço criado: ${parsed.data.name}`,
    })
    revalidatePath('/servicos')
    return ok('Serviço criado.', { id: serviceId })
  } catch (error) {
    return fail(error)
  }
}

export async function updateServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('services.manage')
  const serviceId = uuidSchema.safeParse(text(formData, 'serviceId'))
  if (!serviceId.success) return fail(serviceId.error)

  const parsed = readServiceForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await updateService(context.tenant.id, serviceId.data, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'service.updated',
      entity: 'service',
      entityId: serviceId.data,
      summary: `Serviço atualizado: ${parsed.data.name}`,
    })
    revalidatePath('/servicos')
    return ok('Serviço atualizado.')
  } catch (error) {
    return fail(error)
  }
}

export async function toggleServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('services.manage')
  const parsed = z
    .object({ serviceId: uuidSchema, isActive: z.enum(['true', 'false']) })
    .safeParse({
      serviceId: text(formData, 'serviceId'),
      isActive: text(formData, 'isActive'),
    })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const isActive = parsed.data.isActive === 'true'
    await setServiceActive(context.tenant.id, parsed.data.serviceId, isActive)
    revalidatePath('/servicos')
    return ok(isActive ? 'Serviço ativado.' : 'Serviço desativado.')
  } catch (error) {
    return fail(error)
  }
}

export async function archiveServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('services.manage')
  const serviceId = uuidSchema.safeParse(text(formData, 'serviceId'))
  if (!serviceId.success) return fail(serviceId.error)

  try {
    await archiveService(context.tenant.id, serviceId.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'service.archived',
      entity: 'service',
      entityId: serviceId.data,
    })
    revalidatePath('/servicos')
    return ok('Serviço removido do catálogo.')
  } catch (error) {
    return fail(error)
  }
}

export async function createServiceCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('services.manage')
  const parsed = serviceCategorySchema.safeParse({ name: text(formData, 'name') })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createServiceCategory(context.tenant.id, parsed.data.name)
    revalidatePath('/servicos')
    return ok('Categoria criada.', { id })
  } catch (error) {
    return fail(error)
  }
}
