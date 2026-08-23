'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthOrThrow, requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  completeOnboarding,
  saveOpeningHours,
  saveSalonSetup,
  setOnboardingStep,
} from '@/features/settings/service'
import { openingHoursSchema, salonSetupSchema } from '@/validators/tenant'
import { changePasswordSchema } from '@/validators/auth'
import { changePassword } from '@/lib/auth/service'
import type { FormState } from './types'
import { fail, fromZod } from './form'

export async function saveSalonAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('settings.manage')

  const parsed = salonSetupSchema.safeParse({
    name: formData.get('name'),
    legalName: formData.get('legalName') ?? '',
    document: formData.get('document') ?? '',
    phone: formData.get('phone') ?? '',
    whatsapp: formData.get('whatsapp') ?? '',
    email: formData.get('email') ?? '',
    timezone: formData.get('timezone') ?? 'America/Sao_Paulo',
    currency: formData.get('currency') ?? 'BRL',
    appointmentIntervalMin: formData.get('appointmentIntervalMin') ?? 15,
    cancellationPolicyHours: formData.get('cancellationPolicyHours') ?? 24,
    cancellationPolicyText: formData.get('cancellationPolicyText') ?? '',
    monthlyRevenueGoal: formData.get('monthlyRevenueGoal') || undefined,
    reminder24hEnabled: formData.get('reminder24hEnabled') === 'on',
    reminder2hEnabled: formData.get('reminder2hEnabled') === 'on',
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await saveSalonSetup(context.tenant.id, parsed.data)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'tenant.settings_updated',
      entity: 'tenant',
      entityId: context.tenant.id,
      summary: 'Dados do salão atualizados',
    })
  } catch (error) {
    return fail(error)
  }

  revalidatePath('/configuracoes')
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Dados do salão salvos.' }
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

export async function saveOpeningHoursAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('settings.manage')

  const parsed = openingHoursSchema.safeParse(
    WEEKDAYS.map((weekday) => ({
      weekday,
      isClosed: formData.get(`closed-${weekday}`) === 'on',
      startMin: toMinutes(String(formData.get(`start-${weekday}`) ?? '09:00')),
      endMin: toMinutes(String(formData.get(`end-${weekday}`) ?? '18:00')),
    })),
  )

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Horários inválidos.',
    }
  }

  try {
    await saveOpeningHours(context.tenant.id, parsed.data)
    await setOnboardingStep(context.tenant.id, 2)
  } catch (error) {
    return fail(error)
  }

  revalidatePath('/onboarding')
  revalidatePath('/configuracoes')
  return { status: 'success', message: 'Horários de funcionamento salvos.' }
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':')
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0)
}

export async function finishOnboardingAction(): Promise<FormState> {
  const context = await requirePermission('settings.manage')
  try {
    await completeOnboarding(context.tenant.id)
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'tenant.onboarding_completed',
      entity: 'tenant',
      entityId: context.tenant.id,
    })
  } catch (error) {
    return fail(error)
  }
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Onboarding concluído.' }
}

const changePasswordFormSchema = changePasswordSchema

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireAuthOrThrow()

  const parsed = changePasswordFormSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await changePassword(
      context.user.id,
      parsed.data.currentPassword,
      parsed.data.password,
    )
  } catch (error) {
    return fail(error)
  }

  return { status: 'success', message: 'Senha alterada com sucesso.' }
}
