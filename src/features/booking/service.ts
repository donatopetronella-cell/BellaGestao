import 'server-only'
import { getAdminDb, withTenant } from '@/lib/db'
import { notFound, validationError } from '@/lib/errors'
import { normalizePhone } from '@/lib/utils'
import { createAppointment, getAvailableSlots } from '@/features/appointments/service'
import { resolveServicePricing } from '@/features/services/service'
import type { PublicBookingInput } from '@/validators/booking'

export interface PublicSalon {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  timezone: string
}

export interface PublicService {
  id: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
  categoryName: string | null
  professionals: Array<{ id: string; name: string }>
}

/**
 * Public catalog for the `/{slug}` booking page. Runs on `adminDb` because an
 * anonymous visitor has no tenant/session context yet — everything after the
 * salon is resolved goes through `withTenant`, same as the rest of the app.
 */
export async function getPublicSalon(slug: string): Promise<PublicSalon | null> {
  const tenant = await getAdminDb().tenant.findFirst({
    where: { slug, deletedAt: null, status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } },
    select: { id: true, name: true, slug: true, logoUrl: true, timezone: true },
  })
  return tenant
}

export async function getPublicServices(tenantId: string): Promise<PublicService[]> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx.service.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationMinutes: true,
        category: { select: { name: true } },
        professionals: {
          select: { professional: { select: { id: true, name: true, deletedAt: true } } },
        },
      },
    })
    return rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: Number(row.price),
        durationMinutes: row.durationMinutes,
        categoryName: row.category?.name ?? null,
        professionals: row.professionals
          .map((link) => link.professional)
          .filter((professional) => !professional.deletedAt)
          .map((professional) => ({ id: professional.id, name: professional.name })),
      }))
      .filter((service) => service.professionals.length > 0)
  })
}

export async function getPublicSlots(
  tenantId: string,
  options: { serviceId: string; professionalId: string; dateKey: string; timeZone: string },
): Promise<string[]> {
  const pricing = await resolveServicePricing(tenantId, options.serviceId, options.professionalId)
  const slots = await getAvailableSlots(tenantId, {
    dateKey: options.dateKey,
    professionalId: options.professionalId,
    durationMinutes: pricing.durationMinutes,
    timeZone: options.timeZone,
  })
  return slots.map((slot) => slot.time)
}

/** Finds the client by phone or creates one, then books through the same path
 * the internal agenda uses (`source: 'ONLINE'`). */
export async function createPublicBooking(
  input: PublicBookingInput,
  timeZone: string,
): Promise<{ id: string; startsAt: Date }> {
  const digits = normalizePhone(input.clientPhone)
  if (digits.length < 10) throw validationError('Informe um telefone válido com DDD.')

  const clientId = await withTenant(input.tenantId, async (tx) => {
    const service = await tx.service.findFirst({
      where: { id: input.serviceId, tenantId: input.tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    })
    if (!service) throw notFound('Serviço não encontrado.')

    const existing = await tx.client.findFirst({
      where: { tenantId: input.tenantId, phone: input.clientPhone, deletedAt: null },
      select: { id: true },
    })
    if (existing) return existing.id

    const branch = await tx.branch.findFirst({
      where: { tenantId: input.tenantId, isDefault: true },
      select: { id: true },
    })

    const client = await tx.client.create({
      data: {
        tenantId: input.tenantId,
        branchId: branch?.id ?? null,
        name: input.clientName,
        phone: input.clientPhone,
        source: 'agenda_online',
      },
      select: { id: true },
    })
    return client.id
  })

  const result = await createAppointment(
    input.tenantId,
    {
      clientId,
      professionalId: input.professionalId,
      date: input.date,
      time: input.time,
      serviceIds: [input.serviceId],
      notes: input.notes,
      source: 'ONLINE',
    },
    { timeZone, userId: null },
  )

  return { id: result.id, startsAt: result.startsAt }
}
