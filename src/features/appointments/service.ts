import 'server-only'
import type { AppointmentStatus } from '@/generated/prisma/enums'
import { withTenant, type TenantClient } from '@/lib/db'
import { conflict, notFound, validationError } from '@/lib/errors'
import {
  endOfDayInTimeZone,
  minutesInDay,
  startOfDayInTimeZone,
  toDateKey,
  zonedToUtc,
  zonedWeekday,
} from '@/lib/dates'
import type { AppointmentInput } from '@/validators/appointment'
import { canTransition, OPEN_STATUSES } from './status'

export interface AgendaAppointment {
  id: string
  clientId: string
  clientName: string
  clientPhone: string | null
  professionalId: string
  professionalName: string
  startsAt: Date
  endsAt: Date
  startMinutes: number
  durationMinutes: number
  status: AppointmentStatus
  services: Array<{ id: string; name: string; price: number }>
  total: number
  notes: string | null
  dateKey: string
}

export interface AgendaColumn {
  professionalId: string
  professionalName: string
  color: string | null
  startMin: number | null
  endMin: number | null
  breakStartMin: number | null
  breakEndMin: number | null
}

export interface AgendaDay {
  dateKey: string
  weekday: number
  openMin: number
  closeMin: number
  slotMinutes: number
  isClosed: boolean
  columns: AgendaColumn[]
  appointments: AgendaAppointment[]
}

const DEFAULT_OPEN = 8 * 60
const DEFAULT_CLOSE = 20 * 60

function mapAppointment(
  row: {
    id: string
    clientId: string
    professionalId: string
    startsAt: Date
    endsAt: Date
    status: AppointmentStatus
    total: unknown
    notes: string | null
    client: { name: string; phone: string | null }
    professional: { name: string }
    services: Array<{ price: unknown; service: { id: string; name: string } }>
  },
  timeZone: string,
): AgendaAppointment {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client.name,
    clientPhone: row.client.phone,
    professionalId: row.professionalId,
    professionalName: row.professional.name,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    startMinutes: minutesInDay(row.startsAt, timeZone),
    durationMinutes: Math.max(
      15,
      Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60_000),
    ),
    status: row.status,
    services: row.services.map((item) => ({
      id: item.service.id,
      name: item.service.name,
      price: Number(item.price),
    })),
    total: Number(row.total),
    notes: row.notes,
    dateKey: toDateKey(row.startsAt, timeZone),
  }
}

const APPOINTMENT_SELECT = {
  id: true,
  clientId: true,
  professionalId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  total: true,
  notes: true,
  client: { select: { name: true, phone: true } },
  professional: { select: { name: true } },
  services: {
    select: { price: true, service: { select: { id: true, name: true } } },
  },
} as const

export async function getAgendaDay(
  tenantId: string,
  options: { dateKey: string; timeZone: string; professionalId?: string | null },
): Promise<AgendaDay> {
  const { dateKey, timeZone } = options
  const dayStart = zonedToUtc(dateKey, 0, timeZone)
  const dayEnd = zonedToUtc(dateKey, 24 * 60 - 1, timeZone)
  const weekday = zonedWeekday(dayStart, timeZone)

  return withTenant(tenantId, async (tx) => {
    const settings = await tx.tenantSettings.findUnique({
      where: { tenantId },
      select: { appointmentIntervalMin: true },
    })

    const opening = await tx.branchOpeningHour.findFirst({
      where: { tenantId, weekday },
      select: { startMin: true, endMin: true, isClosed: true },
    })

    const professionals = await tx.professional.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(options.professionalId ? { id: options.professionalId } : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        workingHours: {
          where: { weekday },
          select: {
            startMin: true,
            endMin: true,
            breakStartMin: true,
            breakEndMin: true,
          },
        },
      },
    })

    const rows = await tx.appointment.findMany({
      where: {
        tenantId,
        startsAt: { gte: dayStart, lte: dayEnd },
        ...(options.professionalId ? { professionalId: options.professionalId } : {}),
      },
      orderBy: { startsAt: 'asc' },
      select: APPOINTMENT_SELECT,
    })

    const columns: AgendaColumn[] = professionals.map((professional) => {
      const hours = professional.workingHours[0]
      return {
        professionalId: professional.id,
        professionalName: professional.name,
        color: professional.color,
        startMin: hours?.startMin ?? null,
        endMin: hours?.endMin ?? null,
        breakStartMin: hours?.breakStartMin ?? null,
        breakEndMin: hours?.breakEndMin ?? null,
      }
    })

    const appointments = rows.map((row) => mapAppointment(row, timeZone))

    // The grid spans the salon hours, widened to fit the team's shifts and any
    // appointment that falls outside them.
    const candidateStarts = [
      opening && !opening.isClosed ? opening.startMin : DEFAULT_OPEN,
      ...columns.map((column) => column.startMin).filter((value): value is number => value !== null),
      ...appointments.map((appointment) => appointment.startMinutes),
    ]
    const candidateEnds = [
      opening && !opening.isClosed ? opening.endMin : DEFAULT_CLOSE,
      ...columns.map((column) => column.endMin).filter((value): value is number => value !== null),
      ...appointments.map(
        (appointment) => appointment.startMinutes + appointment.durationMinutes,
      ),
    ]

    const openMin = Math.max(0, Math.min(...candidateStarts) - 30)
    const closeMin = Math.min(24 * 60, Math.max(...candidateEnds) + 30)

    return {
      dateKey,
      weekday,
      slotMinutes: Math.max(15, settings?.appointmentIntervalMin ?? 30),
      openMin: Math.floor(openMin / 30) * 30,
      closeMin: Math.ceil(closeMin / 30) * 30,
      isClosed: opening?.isClosed ?? false,
      columns,
      appointments,
    }
  })
}

export interface AgendaWeekDay {
  dateKey: string
  weekday: number
  appointments: AgendaAppointment[]
  total: number
}

export async function getAgendaWeek(
  tenantId: string,
  options: { dateKeys: string[]; timeZone: string; professionalId?: string | null },
): Promise<AgendaWeekDay[]> {
  const { dateKeys, timeZone } = options
  const first = dateKeys[0]
  const last = dateKeys[dateKeys.length - 1]
  if (!first || !last) return []

  const rows = await withTenant(tenantId, (tx) =>
    tx.appointment.findMany({
      where: {
        tenantId,
        startsAt: {
          gte: zonedToUtc(first, 0, timeZone),
          lte: zonedToUtc(last, 24 * 60 - 1, timeZone),
        },
        ...(options.professionalId ? { professionalId: options.professionalId } : {}),
      },
      orderBy: { startsAt: 'asc' },
      select: APPOINTMENT_SELECT,
    }),
  )

  const appointments = rows.map((row) => mapAppointment(row, timeZone))

  return dateKeys.map((dateKey) => {
    const ofDay = appointments.filter(
      (appointment) => appointment.dateKey === dateKey,
    )
    return {
      dateKey,
      weekday: zonedWeekday(zonedToUtc(dateKey, 12 * 60, timeZone), timeZone),
      appointments: ofDay,
      total: ofDay
        .filter((appointment) => appointment.status !== 'CANCELED')
        .reduce((sum, appointment) => sum + appointment.total, 0),
    }
  })
}

export async function getAppointment(
  tenantId: string,
  appointmentId: string,
  timeZone: string,
): Promise<AgendaAppointment> {
  const row = await withTenant(tenantId, (tx) =>
    tx.appointment.findFirst({
      where: { id: appointmentId, tenantId },
      select: APPOINTMENT_SELECT,
    }),
  )
  if (!row) throw notFound('Atendimento não encontrado.')
  return mapAppointment(row, timeZone)
}

async function assertNoConflict(
  tx: TenantClient,
  params: {
    tenantId: string
    professionalId: string
    startsAt: Date
    endsAt: Date
    ignoreAppointmentId?: string
  },
): Promise<void> {
  const clash = await tx.appointment.findFirst({
    where: {
      tenantId: params.tenantId,
      professionalId: params.professionalId,
      status: { in: [...OPEN_STATUSES, 'FINISHED'] },
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
      ...(params.ignoreAppointmentId ? { id: { not: params.ignoreAppointmentId } } : {}),
    },
    select: { id: true, startsAt: true, client: { select: { name: true } } },
  })

  if (clash) {
    throw conflict(
      `Este horário conflita com o atendimento de ${clash.client.name}. Escolha outro horário.`,
    )
  }
}

interface ResolvedServices {
  items: Array<{
    serviceId: string
    price: number
    durationMinutes: number
    commissionAmount: number
  }>
  total: number
  durationMinutes: number
}

/** Price/duration/commission per service, honouring per-professional overrides. */
async function resolveServices(
  tx: TenantClient,
  tenantId: string,
  serviceIds: string[],
  professionalId: string,
): Promise<ResolvedServices> {
  const services = await tx.service.findMany({
    where: { tenantId, id: { in: serviceIds }, deletedAt: null },
    select: {
      id: true,
      price: true,
      durationMinutes: true,
      commissionKind: true,
      commissionValue: true,
    },
  })

  if (services.length !== new Set(serviceIds).size) {
    throw notFound('Serviço não encontrado neste salão.')
  }

  const professional = await tx.professional.findFirst({
    where: { id: professionalId, tenantId, deletedAt: null },
    select: { commissionPercent: true },
  })
  if (!professional) throw notFound('Profissional não encontrado neste salão.')

  const overrides = await tx.serviceProfessional.findMany({
    where: { tenantId, professionalId, serviceId: { in: serviceIds } },
    select: {
      serviceId: true,
      price: true,
      durationMinutes: true,
      commissionValue: true,
    },
  })
  const overrideByService = new Map(
    overrides.map((override) => [override.serviceId, override]),
  )

  const items = serviceIds.map((serviceId) => {
    const service = services.find((row) => row.id === serviceId)!
    const override = overrideByService.get(serviceId)
    const price = Number(override?.price ?? service.price)
    const durationMinutes = override?.durationMinutes ?? service.durationMinutes
    const rate =
      override?.commissionValue !== null && override?.commissionValue !== undefined
        ? Number(override.commissionValue)
        : Number(service.commissionValue) || Number(professional.commissionPercent)

    const commissionAmount =
      service.commissionKind === 'FIXED'
        ? rate
        : Math.round(((price * rate) / 100) * 100) / 100

    return { serviceId, price, durationMinutes, commissionAmount }
  })

  return {
    items,
    total: items.reduce((sum, item) => sum + item.price, 0),
    durationMinutes: items.reduce((sum, item) => sum + item.durationMinutes, 0),
  }
}

export interface CreateAppointmentResult {
  id: string
  startsAt: Date
  endsAt: Date
  total: number
}

export async function createAppointment(
  tenantId: string,
  input: AppointmentInput,
  meta: { timeZone: string; userId?: string | null },
): Promise<CreateAppointmentResult> {
  const startsAt = zonedToUtc(input.date, timeToMinutes(input.time), meta.timeZone)

  return withTenant(
    tenantId,
    async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: input.clientId, tenantId, deletedAt: null },
        select: { id: true, name: true },
      })
      if (!client) throw notFound('Cliente não encontrada neste salão.')

      const branch = await tx.branch.findFirst({
        where: { tenantId, isDefault: true },
        select: { id: true },
      })
      if (!branch) throw validationError('Nenhuma unidade configurada.')

      const resolved = await resolveServices(
        tx,
        tenantId,
        input.serviceIds,
        input.professionalId,
      )
      const endsAt = new Date(startsAt.getTime() + resolved.durationMinutes * 60_000)

      await assertNoConflict(tx, {
        tenantId,
        professionalId: input.professionalId,
        startsAt,
        endsAt,
      })

      const appointment = await tx.appointment.create({
        data: {
          tenantId,
          branchId: branch.id,
          clientId: input.clientId,
          professionalId: input.professionalId,
          startsAt,
          endsAt,
          status: 'PENDING',
          source: input.source,
          notes: input.notes || null,
          total: resolved.total,
          createdById: meta.userId ?? null,
          services: {
            create: resolved.items.map((item) => ({
              tenantId,
              serviceId: item.serviceId,
              professionalId: input.professionalId,
              price: item.price,
              durationMinutes: item.durationMinutes,
              commissionAmount: item.commissionAmount,
            })),
          },
        },
        select: { id: true, startsAt: true, endsAt: true, total: true },
      })

      await tx.notification.create({
        data: {
          tenantId,
          type: 'APPOINTMENT_CREATED',
          title: 'Novo agendamento',
          body: `${client.name} · ${input.date} às ${input.time}`,
          data: { appointmentId: appointment.id },
        },
      })

      return {
        id: appointment.id,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        total: Number(appointment.total),
      }
    },
    meta.userId ?? null,
  )
}

export async function updateAppointment(
  tenantId: string,
  appointmentId: string,
  input: AppointmentInput,
  meta: { timeZone: string; userId?: string | null },
): Promise<void> {
  const startsAt = zonedToUtc(input.date, timeToMinutes(input.time), meta.timeZone)

  await withTenant(
    tenantId,
    async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        select: { id: true, status: true },
      })
      if (!existing) throw notFound('Atendimento não encontrado.')
      if (existing.status === 'FINISHED') {
        throw conflict('Um atendimento finalizado não pode ser alterado.')
      }
      if (existing.status === 'CANCELED' || existing.status === 'NO_SHOW') {
        throw conflict('Um atendimento cancelado não pode ser alterado.')
      }

      const resolved = await resolveServices(
        tx,
        tenantId,
        input.serviceIds,
        input.professionalId,
      )
      const endsAt = new Date(startsAt.getTime() + resolved.durationMinutes * 60_000)

      await assertNoConflict(tx, {
        tenantId,
        professionalId: input.professionalId,
        startsAt,
        endsAt,
        ignoreAppointmentId: appointmentId,
      })

      await tx.appointmentService.deleteMany({ where: { tenantId, appointmentId } })
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          clientId: input.clientId,
          professionalId: input.professionalId,
          startsAt,
          endsAt,
          notes: input.notes || null,
          total: resolved.total,
          services: {
            create: resolved.items.map((item) => ({
              tenantId,
              serviceId: item.serviceId,
              professionalId: input.professionalId,
              price: item.price,
              durationMinutes: item.durationMinutes,
              commissionAmount: item.commissionAmount,
            })),
          },
        },
      })
    },
    meta.userId ?? null,
  )
}

/** Drag-and-drop and the "reagendar" action share this path. */
export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  input: { date: string; time: string; professionalId: string },
  meta: { timeZone: string; userId?: string | null },
): Promise<void> {
  const startsAt = zonedToUtc(input.date, timeToMinutes(input.time), meta.timeZone)

  await withTenant(
    tenantId,
    async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        select: { id: true, startsAt: true, endsAt: true, status: true },
      })
      if (!existing) throw notFound('Atendimento não encontrado.')
      if (existing.status === 'FINISHED' || existing.status === 'CANCELED') {
        throw conflict('Este atendimento não pode ser reagendado.')
      }

      const duration = existing.endsAt.getTime() - existing.startsAt.getTime()
      const endsAt = new Date(startsAt.getTime() + duration)

      await assertNoConflict(tx, {
        tenantId,
        professionalId: input.professionalId,
        startsAt,
        endsAt,
        ignoreAppointmentId: appointmentId,
      })

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { startsAt, endsAt, professionalId: input.professionalId },
      })
      await tx.appointmentService.updateMany({
        where: { tenantId, appointmentId },
        data: { professionalId: input.professionalId },
      })
    },
    meta.userId ?? null,
  )
}

export async function duplicateAppointment(
  tenantId: string,
  appointmentId: string,
  meta: { timeZone: string; userId?: string | null; weeksAhead?: number },
): Promise<string> {
  return withTenant(
    tenantId,
    async (tx) => {
      const source = await tx.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        select: {
          branchId: true,
          clientId: true,
          professionalId: true,
          startsAt: true,
          endsAt: true,
          total: true,
          notes: true,
          services: {
            select: {
              serviceId: true,
              professionalId: true,
              price: true,
              durationMinutes: true,
              commissionAmount: true,
            },
          },
        },
      })
      if (!source) throw notFound('Atendimento não encontrado.')

      const offset = (meta.weeksAhead ?? 1) * 7 * 24 * 60 * 60 * 1000
      const startsAt = new Date(source.startsAt.getTime() + offset)
      const endsAt = new Date(source.endsAt.getTime() + offset)

      await assertNoConflict(tx, {
        tenantId,
        professionalId: source.professionalId,
        startsAt,
        endsAt,
      })

      const created = await tx.appointment.create({
        data: {
          tenantId,
          branchId: source.branchId,
          clientId: source.clientId,
          professionalId: source.professionalId,
          startsAt,
          endsAt,
          status: 'PENDING',
          source: 'INTERNAL',
          notes: source.notes,
          total: source.total,
          createdById: meta.userId ?? null,
          services: {
            create: source.services.map((item) => ({
              tenantId,
              serviceId: item.serviceId,
              professionalId: item.professionalId,
              price: item.price,
              durationMinutes: item.durationMinutes,
              commissionAmount: item.commissionAmount,
            })),
          },
        },
        select: { id: true },
      })

      return created.id
    },
    meta.userId ?? null,
  )
}

export async function changeAppointmentStatus(
  tenantId: string,
  appointmentId: string,
  status: AppointmentStatus,
  meta: { userId?: string | null; reason?: string | null },
): Promise<void> {
  if (status === 'FINISHED') {
    throw validationError(
      'Use a finalização do atendimento para registrar o pagamento.',
    )
  }

  await withTenant(
    tenantId,
    async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        select: { id: true, status: true, clientId: true },
      })
      if (!existing) throw notFound('Atendimento não encontrado.')

      if (existing.status === status) return

      if (!canTransition(existing.status, status)) {
        throw conflict(
          'Não é possível mudar para este status a partir do status atual.',
        )
      }

      const now = new Date()
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status,
          confirmedAt: status === 'CONFIRMED' ? now : undefined,
          arrivedAt: status === 'ARRIVED' ? now : undefined,
          startedAt: status === 'IN_SERVICE' ? now : undefined,
          canceledAt: status === 'CANCELED' ? now : undefined,
          cancelReason: status === 'CANCELED' ? (meta.reason ?? null) : undefined,
        },
      })

      if (status === 'CANCELED') {
        await tx.notification.create({
          data: {
            tenantId,
            type: 'APPOINTMENT_CANCELED',
            title: 'Atendimento cancelado',
            body: meta.reason ?? 'Cancelado pela equipe do salão.',
            data: { appointmentId },
          },
        })
      }
    },
    meta.userId ?? null,
  )
}

export interface AvailableSlot {
  time: string
  minutes: number
}

/** Free slots for a professional on a day, respecting shift, break and agenda. */
export async function getAvailableSlots(
  tenantId: string,
  options: {
    dateKey: string
    professionalId: string
    durationMinutes: number
    timeZone: string
    ignoreAppointmentId?: string
  },
): Promise<AvailableSlot[]> {
  const { dateKey, timeZone, professionalId, durationMinutes } = options
  const dayStart = zonedToUtc(dateKey, 0, timeZone)
  const weekday = zonedWeekday(dayStart, timeZone)

  return withTenant(tenantId, async (tx) => {
    const settings = await tx.tenantSettings.findUnique({
      where: { tenantId },
      select: { appointmentIntervalMin: true },
    })
    const step = Math.max(5, settings?.appointmentIntervalMin ?? 30)

    const shift = await tx.professionalWorkingHour.findFirst({
      where: { tenantId, professionalId, weekday },
      select: {
        startMin: true,
        endMin: true,
        breakStartMin: true,
        breakEndMin: true,
      },
    })
    if (!shift) return []

    const busy = await tx.appointment.findMany({
      where: {
        tenantId,
        professionalId,
        status: { in: [...OPEN_STATUSES, 'FINISHED'] },
        startsAt: {
          gte: startOfDayInTimeZone(dayStart, timeZone),
          lte: endOfDayInTimeZone(dayStart, timeZone),
        },
        ...(options.ignoreAppointmentId
          ? { id: { not: options.ignoreAppointmentId } }
          : {}),
      },
      select: { startsAt: true, endsAt: true },
    })

    const busyRanges = busy.map((appointment) => ({
      start: minutesInDay(appointment.startsAt, timeZone),
      end:
        minutesInDay(appointment.startsAt, timeZone) +
        Math.round(
          (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000,
        ),
    }))

    if (shift.breakStartMin !== null && shift.breakEndMin !== null) {
      busyRanges.push({ start: shift.breakStartMin, end: shift.breakEndMin })
    }

    const slots: AvailableSlot[] = []
    for (
      let minutes = shift.startMin;
      minutes + durationMinutes <= shift.endMin;
      minutes += step
    ) {
      const end = minutes + durationMinutes
      const overlaps = busyRanges.some(
        (range) => minutes < range.end && end > range.start,
      )
      if (!overlaps) {
        slots.push({ minutes, time: formatMinutes(minutes) })
      }
    }

    return slots
  })
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function formatMinutes(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
    value % 60,
  ).padStart(2, '0')}`
}

export interface AgendaOptionsData {
  professionals: Array<{ id: string; name: string; color: string | null }>
  services: Array<{
    id: string
    name: string
    durationMinutes: number
    price: number
    professionalIds: string[]
  }>
}

/** Everything the appointment form needs, in one round-trip. */
export async function getAgendaOptions(
  tenantId: string,
): Promise<AgendaOptionsData> {
  return withTenant(tenantId, async (tx) => {
    const professionals = await tx.professional.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    })

    const services = await tx.service.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        price: true,
        professionals: { select: { professionalId: true } },
      },
    })

    return {
      professionals,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: Number(service.price),
        professionalIds: service.professionals.map((link) => link.professionalId),
      })),
    }
  })
}

export async function searchClientsForAgenda(
  tenantId: string,
  term: string,
): Promise<Array<{ id: string; name: string; phone: string | null }>> {
  const search = term.trim()
  if (search.length < 2) return []

  return withTenant(tenantId, (tx) =>
    tx.client.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search.replace(/\D/g, '') || search } },
          { whatsapp: { contains: search.replace(/\D/g, '') || search } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 8,
      select: { id: true, name: true, phone: true },
    }),
  )
}
