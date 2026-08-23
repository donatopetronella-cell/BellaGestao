'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAnyPermission, requirePermission } from '@/lib/auth/context'
import { writeAudit } from '@/lib/audit'
import {
  changeAppointmentStatus,
  createAppointment,
  duplicateAppointment,
  getAvailableSlots,
  rescheduleAppointment,
  searchClientsForAgenda,
  updateAppointment,
} from '@/features/appointments/service'
import { finishAppointment } from '@/features/appointments/finish'
import { APPOINTMENT_STATUS_LABELS } from '@/features/appointments/status'
import {
  appointmentSchema,
  appointmentStatusSchema,
  finishAppointmentSchema,
  rescheduleSchema,
} from '@/validators/appointment'
import { uuidSchema } from '@/validators/common'
import type { FormState } from './types'
import { fail, fromZod, ok, text, textList } from './form'

function readAppointmentForm(formData: FormData) {
  return appointmentSchema.safeParse({
    clientId: text(formData, 'clientId'),
    professionalId: text(formData, 'professionalId'),
    date: text(formData, 'date'),
    time: text(formData, 'time'),
    serviceIds: textList(formData, 'serviceIds'),
    notes: text(formData, 'notes'),
    source: 'INTERNAL',
  })
}

function revalidateAgenda(): void {
  revalidatePath('/agenda')
  revalidatePath('/painel')
}

export async function createAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('agenda.create')
  const parsed = readAppointmentForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const result = await createAppointment(context.tenant.id, parsed.data, {
      timeZone: context.tenant.timezone,
      userId: context.user.id,
    })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'appointment.created',
      entity: 'appointment',
      entityId: result.id,
      summary: `Agendamento criado para ${parsed.data.date} às ${parsed.data.time}`,
    })
    revalidateAgenda()
    return ok('Agendamento criado.', { id: result.id })
  } catch (error) {
    return fail(error)
  }
}

export async function updateAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('agenda.update')
  const appointmentId = uuidSchema.safeParse(text(formData, 'appointmentId'))
  if (!appointmentId.success) return fail(appointmentId.error)

  const parsed = readAppointmentForm(formData)
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await updateAppointment(context.tenant.id, appointmentId.data, parsed.data, {
      timeZone: context.tenant.timezone,
      userId: context.user.id,
    })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'appointment.updated',
      entity: 'appointment',
      entityId: appointmentId.data,
    })
    revalidateAgenda()
    return ok('Agendamento atualizado.')
  } catch (error) {
    return fail(error)
  }
}

export async function rescheduleAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('agenda.update')
  const parsed = rescheduleSchema.safeParse({
    appointmentId: text(formData, 'appointmentId'),
    date: text(formData, 'date'),
    time: text(formData, 'time'),
    professionalId: text(formData, 'professionalId'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await rescheduleAppointment(
      context.tenant.id,
      parsed.data.appointmentId,
      parsed.data,
      { timeZone: context.tenant.timezone, userId: context.user.id },
    )
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'appointment.rescheduled',
      entity: 'appointment',
      entityId: parsed.data.appointmentId,
      summary: `Reagendado para ${parsed.data.date} às ${parsed.data.time}`,
    })
    revalidateAgenda()
    return ok('Atendimento reagendado.')
  } catch (error) {
    return fail(error)
  }
}

export async function changeAppointmentStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const status = text(formData, 'status')
  const context =
    status === 'CANCELED' || status === 'NO_SHOW'
      ? await requirePermission('agenda.cancel')
      : await requirePermission('agenda.update')

  const parsed = appointmentStatusSchema.safeParse({
    appointmentId: text(formData, 'appointmentId'),
    status,
    reason: text(formData, 'reason'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await changeAppointmentStatus(
      context.tenant.id,
      parsed.data.appointmentId,
      parsed.data.status,
      { userId: context.user.id, reason: parsed.data.reason || null },
    )
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: `appointment.${parsed.data.status.toLowerCase()}`,
      entity: 'appointment',
      entityId: parsed.data.appointmentId,
      summary: APPOINTMENT_STATUS_LABELS[parsed.data.status],
    })
    revalidateAgenda()
    return ok(`Status alterado para ${APPOINTMENT_STATUS_LABELS[parsed.data.status]}.`)
  } catch (error) {
    return fail(error)
  }
}

export async function duplicateAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('agenda.create')
  const parsed = z
    .object({
      appointmentId: uuidSchema,
      weeksAhead: z.coerce.number().int().min(1).max(12).default(1),
    })
    .safeParse({
      appointmentId: text(formData, 'appointmentId'),
      weeksAhead: text(formData, 'weeksAhead') || 1,
    })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const id = await duplicateAppointment(
      context.tenant.id,
      parsed.data.appointmentId,
      {
        timeZone: context.tenant.timezone,
        userId: context.user.id,
        weeksAhead: parsed.data.weeksAhead,
      },
    )
    revalidateAgenda()
    return ok(
      `Atendimento duplicado para ${parsed.data.weeksAhead} semana(s) à frente.`,
      { id },
    )
  } catch (error) {
    return fail(error)
  }
}

export async function finishAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('agenda.finish')

  const methods = textList(formData, 'paymentMethod')
  const amounts = formData.getAll('paymentAmount').map((value) => String(value))
  const installments = formData.getAll('paymentInstallments').map((value) =>
    String(value),
  )

  const payments = methods
    .map((method, index) => ({
      method,
      amount: Number(amounts[index] ?? 0),
      installments: Number(installments[index] ?? 1) || 1,
    }))
    .filter((payment) => payment.amount > 0)

  const parsed = finishAppointmentSchema.safeParse({
    appointmentId: text(formData, 'appointmentId'),
    discount: text(formData, 'discount') || 0,
    payments,
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const result = await finishAppointment(context.tenant.id, parsed.data, {
      userId: context.user.id,
    })
    await writeAudit({
      tenantId: context.tenant.id,
      userId: context.user.id,
      userName: context.user.name,
      action: 'appointment.finished',
      entity: 'appointment',
      entityId: parsed.data.appointmentId,
      summary: `Atendimento finalizado · venda #${result.saleNumber} · ${result.total.toFixed(2)}`,
    })
    revalidateAgenda()
    revalidatePath('/caixa')
    revalidatePath('/clientes')

    const notes = [
      `Atendimento finalizado. Venda #${result.saleNumber}.`,
      result.cashRegisterOpen
        ? null
        : 'Nenhum caixa aberto: o pagamento foi registrado, mas não entrou no caixa.',
      result.loyaltyPointsEarned > 0
        ? `${result.loyaltyPointsEarned} pontos de fidelidade creditados.`
        : null,
    ].filter(Boolean)

    return ok(notes.join(' '))
  } catch (error) {
    return fail(error)
  }
}

/** Autocomplete used by the appointment form. */
export async function searchClientsAction(
  term: string,
): Promise<Array<{ id: string; name: string; phone: string | null }>> {
  const context = await requirePermission('clients.view')
  return searchClientsForAgenda(context.tenant.id, term)
}

/** Free slots for the picked professional/day/duration. */
export async function availableSlotsAction(input: {
  date: string
  professionalId: string
  durationMinutes: number
  ignoreAppointmentId?: string
}): Promise<string[]> {
  const context = await requireAnyPermission(['agenda.view', 'agenda.view_own'])
  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      professionalId: uuidSchema,
      durationMinutes: z.number().int().min(5).max(600),
      ignoreAppointmentId: uuidSchema.optional(),
    })
    .safeParse(input)
  if (!parsed.success) return []

  const slots = await getAvailableSlots(context.tenant.id, {
    dateKey: parsed.data.date,
    professionalId: parsed.data.professionalId,
    durationMinutes: parsed.data.durationMinutes,
    timeZone: context.tenant.timezone,
    ignoreAppointmentId: parsed.data.ignoreAppointmentId,
  })
  return slots.map((slot) => slot.time)
}
