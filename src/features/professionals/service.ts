import 'server-only'
import { withTenant } from '@/lib/db'
import { conflict, notFound } from '@/lib/errors'
import { startOfMonthInTimeZone } from '@/lib/dates'
import type { ProfessionalInput } from '@/validators/professional'

export interface ProfessionalListItem {
  id: string
  name: string
  specialty: string | null
  phone: string | null
  email: string | null
  color: string | null
  commissionPercent: number
  isActive: boolean
  serviceCount: number
  hasSystemAccess: boolean
}

export async function listProfessionals(
  tenantId: string,
  filters: { search?: string; includeInactive?: boolean } = {},
): Promise<ProfessionalListItem[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.professional.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.includeInactive ? {} : { isActive: true }),
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        specialty: true,
        phone: true,
        email: true,
        color: true,
        commissionPercent: true,
        isActive: true,
        membership: { select: { id: true } },
        _count: { select: { services: true } },
      },
    }),
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    phone: row.phone,
    email: row.email,
    color: row.color,
    commissionPercent: Number(row.commissionPercent),
    isActive: row.isActive,
    serviceCount: row._count.services,
    hasSystemAccess: row.membership !== null,
  }))
}

export interface WorkingHour {
  weekday: number
  isWorking: boolean
  startMin: number
  endMin: number
  breakStartMin: number | null
  breakEndMin: number | null
}

export interface ProfessionalDetail extends ProfessionalListItem {
  workingHours: WorkingHour[]
  services: Array<{ id: string; name: string; price: number; customPrice: number | null }>
}

export async function getProfessional(
  tenantId: string,
  professionalId: string,
): Promise<ProfessionalDetail> {
  const row = await withTenant(tenantId, (tx) =>
    tx.professional.findFirst({
      where: { id: professionalId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        specialty: true,
        phone: true,
        email: true,
        color: true,
        commissionPercent: true,
        isActive: true,
        membership: { select: { id: true } },
        workingHours: {
          orderBy: { weekday: 'asc' },
          select: {
            weekday: true,
            startMin: true,
            endMin: true,
            breakStartMin: true,
            breakEndMin: true,
          },
        },
        services: {
          select: {
            price: true,
            service: { select: { id: true, name: true, price: true, deletedAt: true } },
          },
        },
      },
    }),
  )

  if (!row) throw notFound('Profissional não encontrado.')

  const hoursByWeekday = new Map(row.workingHours.map((hour) => [hour.weekday, hour]))
  const workingHours: WorkingHour[] = Array.from({ length: 7 }, (_, weekday) => {
    const hour = hoursByWeekday.get(weekday)
    return {
      weekday,
      isWorking: hour !== undefined,
      startMin: hour?.startMin ?? 9 * 60,
      endMin: hour?.endMin ?? 18 * 60,
      breakStartMin: hour?.breakStartMin ?? null,
      breakEndMin: hour?.breakEndMin ?? null,
    }
  })

  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    phone: row.phone,
    email: row.email,
    color: row.color,
    commissionPercent: Number(row.commissionPercent),
    isActive: row.isActive,
    serviceCount: row.services.length,
    hasSystemAccess: row.membership !== null,
    workingHours,
    services: row.services
      .filter((link) => link.service.deletedAt === null)
      .map((link) => ({
        id: link.service.id,
        name: link.service.name,
        price: Number(link.service.price),
        customPrice: link.price === null ? null : Number(link.price),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export async function createProfessional(
  tenantId: string,
  input: ProfessionalInput,
): Promise<string> {
  return withTenant(tenantId, async (tx) => {
    const duplicate = await tx.professional.findFirst({
      where: { tenantId, name: input.name, deletedAt: null },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe um profissional com este nome.')

    const professional = await tx.professional.create({
      data: {
        tenantId,
        name: input.name,
        specialty: input.specialty || null,
        phone: input.phone ?? null,
        email: input.email || null,
        color: input.color || null,
        commissionPercent: input.commissionPercent,
        isActive: input.isActive,
      },
      select: { id: true },
    })

    // Monday to Saturday, 09:00–18:00 with a lunch break — the salon can adjust.
    const branch = await tx.branch.findFirst({
      where: { tenantId, isDefault: true },
      select: { id: true },
    })
    await tx.professionalWorkingHour.createMany({
      data: [1, 2, 3, 4, 5, 6].map((weekday) => ({
        tenantId,
        professionalId: professional.id,
        branchId: branch?.id ?? null,
        weekday,
        startMin: 9 * 60,
        endMin: 18 * 60,
        breakStartMin: 12 * 60,
        breakEndMin: 13 * 60,
      })),
    })

    return professional.id
  })
}

export async function updateProfessional(
  tenantId: string,
  professionalId: string,
  input: ProfessionalInput,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const duplicate = await tx.professional.findFirst({
      where: {
        tenantId,
        name: input.name,
        deletedAt: null,
        id: { not: professionalId },
      },
      select: { id: true },
    })
    if (duplicate) throw conflict('Já existe um profissional com este nome.')

    const result = await tx.professional.updateMany({
      where: { id: professionalId, tenantId, deletedAt: null },
      data: {
        name: input.name,
        specialty: input.specialty || null,
        phone: input.phone ?? null,
        email: input.email || null,
        color: input.color || null,
        commissionPercent: input.commissionPercent,
        isActive: input.isActive,
      },
    })
    if (result.count === 0) throw notFound('Profissional não encontrado.')
  })
}

export async function saveWorkingHours(
  tenantId: string,
  professionalId: string,
  hours: Array<{
    weekday: number
    isWorking: boolean
    startMin: number
    endMin: number
    breakStartMin?: number | null
    breakEndMin?: number | null
  }>,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.findFirst({
      where: { id: professionalId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!professional) throw notFound('Profissional não encontrado.')

    const branch = await tx.branch.findFirst({
      where: { tenantId, isDefault: true },
      select: { id: true },
    })

    await tx.professionalWorkingHour.deleteMany({ where: { tenantId, professionalId } })

    const working = hours.filter((hour) => hour.isWorking)
    if (working.length > 0) {
      await tx.professionalWorkingHour.createMany({
        data: working.map((hour) => ({
          tenantId,
          professionalId,
          branchId: branch?.id ?? null,
          weekday: hour.weekday,
          startMin: hour.startMin,
          endMin: hour.endMin,
          breakStartMin: hour.breakStartMin ?? null,
          breakEndMin: hour.breakEndMin ?? null,
        })),
      })
    }
  })
}

/** Deactivating keeps the history; a professional is never truly deleted. */
export async function archiveProfessional(
  tenantId: string,
  professionalId: string,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const upcoming = await tx.appointment.count({
      where: {
        tenantId,
        professionalId,
        startsAt: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_SERVICE'] },
      },
    })
    if (upcoming > 0) {
      throw conflict(
        `Este profissional tem ${upcoming} atendimento(s) futuro(s). Reagende ou cancele antes de desativar.`,
      )
    }

    const result = await tx.professional.updateMany({
      where: { id: professionalId, tenantId, deletedAt: null },
      data: { isActive: false },
    })
    if (result.count === 0) throw notFound('Profissional não encontrado.')
  })
}

export interface ProfessionalPerformance {
  finishedAppointments: number
  revenue: number
  averageTicket: number
  commissionPending: number
  commissionPaid: number
  clientsServed: number
  topServices: Array<{ name: string; quantity: number; revenue: number }>
}

export async function getProfessionalPerformance(
  tenantId: string,
  professionalId: string,
  timeZone: string,
  now = new Date(),
): Promise<ProfessionalPerformance> {
  const monthStart = startOfMonthInTimeZone(now, timeZone)

  return withTenant(tenantId, async (tx) => {
    const finished = await tx.appointment.aggregate({
      where: {
        tenantId,
        professionalId,
        status: 'FINISHED',
        startsAt: { gte: monthStart },
      },
      _count: { _all: true },
      _sum: { total: true },
    })

    const commissions = await tx.commission.groupBy({
      by: ['status'],
      where: { tenantId, professionalId, referenceMonth: { gte: monthStart } },
      _sum: { amount: true },
    })

    const clients = await tx.appointment.findMany({
      where: {
        tenantId,
        professionalId,
        status: 'FINISHED',
        startsAt: { gte: monthStart },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    })

    const topServices = await tx.$queryRaw<
      Array<{ name: string; quantity: bigint | number; revenue: string | number | null }>
    >`
      SELECT s.name AS name, COUNT(*) AS quantity, COALESCE(SUM(aps.price), 0) AS revenue
      FROM appointment_services aps
      JOIN services s ON s.id = aps.service_id
      JOIN appointments a ON a.id = aps.appointment_id
      WHERE aps.tenant_id = ${tenantId}::uuid
        AND aps.professional_id = ${professionalId}::uuid
        AND a.status = 'FINISHED'
        AND a.starts_at >= ${monthStart}
      GROUP BY s.name
      ORDER BY revenue DESC
      LIMIT 5
    `

    const appointments = finished._count._all
    const revenue = Number(finished._sum.total ?? 0)

    const sumFor = (status: string): number =>
      Number(
        commissions.find((row) => row.status === status)?._sum.amount ?? 0,
      )

    return {
      finishedAppointments: appointments,
      revenue,
      averageTicket: appointments > 0 ? revenue / appointments : 0,
      commissionPending: sumFor('PENDING') + sumFor('APPROVED'),
      commissionPaid: sumFor('PAID'),
      clientsServed: clients.length,
      topServices: topServices.map((row) => ({
        name: row.name,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue ?? 0),
      })),
    }
  })
}
