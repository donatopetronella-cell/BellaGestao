'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  archiveProfessional,
  createProfessional,
  saveWorkingHours,
  updateProfessional,
} from '@/features/professionals/service'
import {
  professionalSchema,
  workingHoursSchema,
} from '@/validators/professional'
import { uuidSchema } from '@/validators/common'
import { parseTimeToMinutes } from '@/lib/dates'
import type { FormState } from './types'
import { checkbox, fail, fromZod, ok, text } from './form'

function readProfessionalForm(formData: FormData) {
  return professionalSchema.safeParse({
    name: text(formData, 'name'),
    specialty: text(formData, 'specialty'),
    phone: text(formData, 'phone'),
    email: text(formData, 'email'),
    color: text(formData, 'color'),
    commissionPercent: text(formData, 'commissionPercent') || 0,
    isActive: checkbox(formData, 'isActive'),
  })
}

export async function createProfessionalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('professionals.manage')
  const parsed = readProfessionalForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await createProfessional(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'professional.created',
      entity: 'professional',
      entityId: id,
      summary: `Profissional cadastrado: ${parsed.data.name}`,
    })
    revalidatePath('/profissionais')
    return ok('Profissional cadastrado.', { id })
  } catch (error) {
    return fail(error)
  }
}

export async function updateProfessionalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('professionals.manage')
  const professionalId = uuidSchema.safeParse(text(formData, 'professionalId'))
  if (!professionalId.success) return fail(professionalId.error)

  const parsed = readProfessionalForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await updateProfessional(context.tenant.id, professionalId.data, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'professional.updated',
      entity: 'professional',
      entityId: professionalId.data,
      summary: `Profissional atualizado: ${parsed.data.name}`,
    })
    revalidatePath('/profissionais')
    revalidatePath(`/profissionais/${professionalId.data}`)
    return ok('Dados atualizados.')
  } catch (error) {
    return fail(error)
  }
}

export async function saveWorkingHoursAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('professionals.manage')
  const professionalId = uuidSchema.safeParse(text(formData, 'professionalId'))
  if (!professionalId.success) return fail(professionalId.error)

  const parsed = workingHoursSchema.safeParse(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      const hasBreak = checkbox(formData, `break-${weekday}`)
      return {
        weekday,
        isWorking: checkbox(formData, `working-${weekday}`),
        startMin: parseTimeToMinutes(text(formData, `start-${weekday}`) || '09:00'),
        endMin: parseTimeToMinutes(text(formData, `end-${weekday}`) || '18:00'),
        breakStartMin: hasBreak
          ? parseTimeToMinutes(text(formData, `breakStart-${weekday}`) || '12:00')
          : null,
        breakEndMin: hasBreak
          ? parseTimeToMinutes(text(formData, `breakEnd-${weekday}`) || '13:00')
          : null,
      }
    }),
  )
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Horários inválidos.',
    }
  }

  try {
    await saveWorkingHours(context.tenant.id, professionalId.data, parsed.data)
    revalidatePath(`/profissionais/${professionalId.data}`)
    revalidatePath('/agenda')
    return ok('Jornada salva.')
  } catch (error) {
    return fail(error)
  }
}

export async function archiveProfessionalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('professionals.manage')
  const professionalId = uuidSchema.safeParse(text(formData, 'professionalId'))
  if (!professionalId.success) return fail(professionalId.error)

  try {
    await archiveProfessional(context.tenant.id, professionalId.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'professional.deactivated',
      entity: 'professional',
      entityId: professionalId.data,
    })
    revalidatePath('/profissionais')
    return ok('Profissional desativado.')
  } catch (error) {
    return fail(error)
  }
}
