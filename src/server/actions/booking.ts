'use server'

import { headers } from 'next/headers'
import { createPublicBooking, getPublicSlots } from '@/features/booking/service'
import { rateLimit } from '@/lib/rate-limit'
import { publicBookingSchema } from '@/validators/booking'
import type { FormState } from './types'
import { fail, fromZod, ok, text } from './form'

async function clientIp(): Promise<string> {
  const headerList = await headers()
  return headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function getPublicSlotsAction(
  tenantId: string,
  serviceId: string,
  professionalId: string,
  dateKey: string,
  timeZone: string,
): Promise<string[]> {
  const ip = await clientIp()
  const limit = rateLimit(`booking-slots:${ip}`, 60, 60)
  if (!limit.allowed) return []
  return getPublicSlots(tenantId, { serviceId, professionalId, dateKey, timeZone })
}

export async function createPublicBookingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ip = await clientIp()
  const limit = rateLimit(`booking-create:${ip}`, 5, 300)
  if (!limit.allowed) {
    return { status: 'error', message: 'Muitas tentativas. Tente novamente em alguns minutos.' }
  }

  const parsed = publicBookingSchema.safeParse({
    tenantId: text(formData, 'tenantId'),
    serviceId: text(formData, 'serviceId'),
    professionalId: text(formData, 'professionalId'),
    date: text(formData, 'date'),
    time: text(formData, 'time'),
    clientName: text(formData, 'clientName'),
    clientPhone: text(formData, 'clientPhone'),
    notes: text(formData, 'notes'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const timeZone = text(formData, 'timeZone') || 'America/Sao_Paulo'
    const result = await createPublicBooking(parsed.data, timeZone)
    return ok('Agendamento confirmado!', { appointmentId: result.id })
  } catch (error) {
    return fail(error)
  }
}
