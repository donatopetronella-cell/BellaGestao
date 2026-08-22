import 'server-only'
import type { AppointmentStatus } from '@/generated/prisma/enums'
import { withTenant } from '@/lib/db'
import {
  addMonths,
  endOfDayInTimeZone,
  resolveRange,
  startOfDayInTimeZone,
  startOfMonthInTimeZone,
  type DashboardRange,
} from '@/lib/dates'

export interface TodaySnapshot {
  scheduled: number
  confirmed: number
  finished: number
  canceled: number
  noShow: number
  expectedRevenue: number
  receivedRevenue: number
  activeProfessionals: number
  freeSlots: number
}

export interface FinanceSnapshot {
  revenueToday: number
  revenueMonth: number
  forecastMonth: number
  expensesMonth: number
  estimatedProfit: number
  monthlyGoal: number | null
  goalProgress: number | null
}

export interface ClientSnapshot {
  total: number
  newInRange: number
  returning: number
  inactive90d: number
  returnRate: number
}

export interface ProfessionalPerformance {
  id: string
  name: string
  appointments: number
  revenue: number
  averageTicket: number
}

export interface RevenuePoint {
  label: string
  revenue: number
}

export interface TopService {
  name: string
  quantity: number
  revenue: number
}

export interface DashboardData {
  today: TodaySnapshot
  finance: FinanceSnapshot
  clients: ClientSnapshot
  professionals: ProfessionalPerformance[]
  monthlyRevenue: RevenuePoint[]
  dailyRevenue: RevenuePoint[]
  topServices: TopService[]
  rangeLabel: string
}

const OPEN_STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'ARRIVED',
  'IN_SERVICE',
]

const MONTH_LABELS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

interface RawMonthRow {
  bucket: Date
  revenue: string | number | null
}

interface RawTopServiceRow {
  name: string
  quantity: string | number
  revenue: string | number | null
}

/**
 * One transaction, one RLS context, every dashboard number. All values come
 * from the tenant's own rows — nothing here is simulated.
 */
export async function getDashboardData(
  tenantId: string,
  options: {
    range: DashboardRange
    timeZone: string
    professionalId?: string | null
    now?: Date
  },
): Promise<DashboardData> {
  const now = options.now ?? new Date()
  const timeZone = options.timeZone
  const range = resolveRange(options.range, timeZone, now)
  const todayStart = startOfDayInTimeZone(now, timeZone)
  const todayEnd = endOfDayInTimeZone(now, timeZone)
  const monthStart = startOfMonthInTimeZone(now, timeZone)
  const scopeProfessional = options.professionalId
    ? { professionalId: options.professionalId }
    : {}
  // Same restriction for the raw aggregations: a professional only sees the
  // revenue they produced.
  const scopedProfessionalId = options.professionalId ?? null

  return withTenant(tenantId, async (tx) => {
    // Sequential on purpose: every query below shares the single connection
    // pinned to this transaction (that is what carries the RLS context).
    const statusGroups = await tx.appointment.groupBy({
        by: ['status'],
        where: { tenantId, startsAt: { gte: todayStart, lte: todayEnd }, ...scopeProfessional },
        _count: { _all: true },
      })
    const todayAggregate = await tx.appointment.aggregate({
        where: {
          tenantId,
          startsAt: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELED', 'NO_SHOW'] },
          ...scopeProfessional,
        },
        _sum: { total: true },
      })
    const receivedToday = await tx.sale.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          soldAt: { gte: todayStart, lte: todayEnd },
          ...scopeProfessional,
        },
        _sum: { total: true },
      })
    const revenueMonthAggregate = await tx.sale.aggregate({
        where: {
          tenantId,
          status: 'PAID',
          soldAt: { gte: monthStart, lte: todayEnd },
          ...scopeProfessional,
        },
        _sum: { total: true },
      })
    const forecastAggregate = await tx.appointment.aggregate({
        where: {
          tenantId,
          startsAt: { gte: todayStart },
          status: { in: OPEN_STATUSES },
          ...scopeProfessional,
        },
        _sum: { total: true },
      })
    const expensesAggregate = await tx.expense.aggregate({
        where: { tenantId, OR: [{ paidAt: { gte: monthStart } }, { dueDate: { gte: monthStart } }] },
        _sum: { amount: true },
      })
    const activeProfessionals = await tx.professional.count({ where: { tenantId, isActive: true, deletedAt: null } })
    const settings = await tx.tenantSettings.findUnique({
        where: { tenantId },
        select: { monthlyRevenueGoal: true, appointmentIntervalMin: true },
      })
    const totalClients = await tx.client.count({ where: { tenantId, deletedAt: null } })
    const newClients = await tx.client.count({
        where: { tenantId, deletedAt: null, createdAt: { gte: range.from, lte: range.to } },
      })
    const returningClients = await tx.client.count({
        where: {
          tenantId,
          deletedAt: null,
          lastVisitAt: { gte: range.from, lte: range.to },
          createdAt: { lt: range.from },
        },
      })
    const inactiveClients = await tx.client.count({
        where: {
          tenantId,
          deletedAt: null,
          lastVisitAt: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
        },
      })
    const professionalRows = await tx.appointment.groupBy({
        by: ['professionalId'],
        where: {
          tenantId,
          startsAt: { gte: range.from, lte: range.to },
          status: 'FINISHED',
          ...scopeProfessional,
        },
        _count: { _all: true },
        _sum: { total: true },
      })
    const monthlyRows = await tx.$queryRaw<RawMonthRow[]>`
        SELECT date_trunc('month', a.starts_at) AS bucket,
               COALESCE(SUM(a.total), 0) AS revenue
        FROM appointments a
        WHERE a.tenant_id = ${tenantId}::uuid
          AND a.status = 'FINISHED'
          AND a.starts_at >= ${addMonths(monthStart, -5)}
          AND (${scopedProfessionalId}::uuid IS NULL OR a.professional_id = ${scopedProfessionalId}::uuid)
        GROUP BY 1
        ORDER BY 1
      `
    const dailyRows = await tx.$queryRaw<RawMonthRow[]>`
        SELECT date_trunc('day', a.starts_at) AS bucket,
               COALESCE(SUM(a.total), 0) AS revenue
        FROM appointments a
        WHERE a.tenant_id = ${tenantId}::uuid
          AND a.status = 'FINISHED'
          AND a.starts_at >= ${range.from}
          AND a.starts_at <= ${range.to}
          AND (${scopedProfessionalId}::uuid IS NULL OR a.professional_id = ${scopedProfessionalId}::uuid)
        GROUP BY 1
        ORDER BY 1
      `
    const topServiceRows = await tx.$queryRaw<RawTopServiceRow[]>`
        SELECT s.name AS name,
               COUNT(*) AS quantity,
               COALESCE(SUM(aps.price), 0) AS revenue
        FROM appointment_services aps
        JOIN services s ON s.id = aps.service_id
        JOIN appointments a ON a.id = aps.appointment_id
        WHERE aps.tenant_id = ${tenantId}::uuid
          AND a.status = 'FINISHED'
          AND a.starts_at >= ${range.from}
          AND a.starts_at <= ${range.to}
          AND (${scopedProfessionalId}::uuid IS NULL OR aps.professional_id = ${scopedProfessionalId}::uuid)
        GROUP BY s.name
        ORDER BY revenue DESC
        LIMIT 5
      `

    const countByStatus = (status: AppointmentStatus): number =>
      statusGroups.find((group) => group.status === status)?._count._all ?? 0

    const professionals = await tx.professional.findMany({
      where: { id: { in: professionalRows.map((row) => row.professionalId) } },
      select: { id: true, name: true },
    })

    const revenueMonth = Number(revenueMonthAggregate._sum.total ?? 0)
    const expensesMonth = Number(expensesAggregate._sum.amount ?? 0)
    const monthlyGoal = settings?.monthlyRevenueGoal
      ? Number(settings.monthlyRevenueGoal)
      : null

    const scheduledToday =
      countByStatus('PENDING') +
      countByStatus('CONFIRMED') +
      countByStatus('ARRIVED') +
      countByStatus('IN_SERVICE') +
      countByStatus('FINISHED')

    const bookedMinutes = await tx.appointment.aggregate({
      where: {
        tenantId,
        startsAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
        ...scopeProfessional,
      },
      _count: { _all: true },
    })

    // Capacity: 10 working hours per active professional, in slots of the
    // configured interval.
    const slotMinutes = settings?.appointmentIntervalMin ?? 30
    const capacitySlots = Math.max(
      0,
      Math.floor((activeProfessionals * 10 * 60) / Math.max(slotMinutes, 15)),
    )
    const freeSlots = Math.max(0, capacitySlots - bookedMinutes._count._all)

    return {
      rangeLabel: range.label,
      today: {
        scheduled: scheduledToday,
        confirmed: countByStatus('CONFIRMED'),
        finished: countByStatus('FINISHED'),
        canceled: countByStatus('CANCELED'),
        noShow: countByStatus('NO_SHOW'),
        expectedRevenue: Number(todayAggregate._sum.total ?? 0),
        receivedRevenue: Number(receivedToday._sum.total ?? 0),
        activeProfessionals,
        freeSlots,
      },
      finance: {
        revenueToday: Number(receivedToday._sum.total ?? 0),
        revenueMonth,
        forecastMonth: revenueMonth + Number(forecastAggregate._sum.total ?? 0),
        expensesMonth,
        estimatedProfit: revenueMonth - expensesMonth,
        monthlyGoal,
        goalProgress:
          monthlyGoal && monthlyGoal > 0
            ? Math.min(100, (revenueMonth / monthlyGoal) * 100)
            : null,
      },
      clients: {
        total: totalClients,
        newInRange: newClients,
        returning: returningClients,
        inactive90d: inactiveClients,
        returnRate:
          totalClients > 0
            ? Math.round((returningClients / totalClients) * 1000) / 10
            : 0,
      },
      professionals: professionalRows
        .map((row) => {
          const appointments = row._count._all
          const revenue = Number(row._sum.total ?? 0)
          return {
            id: row.professionalId,
            name:
              professionals.find((item) => item.id === row.professionalId)?.name ??
              'Profissional',
            appointments,
            revenue,
            averageTicket: appointments > 0 ? revenue / appointments : 0,
          }
        })
        .sort((a, b) => b.revenue - a.revenue),
      monthlyRevenue: monthlyRows.map((row) => {
        const date = new Date(row.bucket)
        return {
          label: MONTH_LABELS[date.getUTCMonth()] ?? '',
          revenue: Number(row.revenue ?? 0),
        }
      }),
      dailyRevenue: dailyRows.map((row) => {
        const date = new Date(row.bucket)
        return {
          label: `${String(date.getUTCDate()).padStart(2, '0')}/${String(
            date.getUTCMonth() + 1,
          ).padStart(2, '0')}`,
          revenue: Number(row.revenue ?? 0),
        }
      }),
      topServices: topServiceRows.map((row) => ({
        name: row.name,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue ?? 0),
      })),
    }
  })
}

export interface AgendaEntry {
  id: string
  startsAt: Date
  endsAt: Date
  status: AppointmentStatus
  clientName: string
  professionalName: string
  services: string[]
  total: number
}

/** Next appointments of the day, for the dashboard timeline. */
export async function getTodayAgenda(
  tenantId: string,
  options: { timeZone: string; professionalId?: string | null; now?: Date; take?: number },
): Promise<AgendaEntry[]> {
  const now = options.now ?? new Date()
  const rows = await withTenant(tenantId, (tx) =>
    tx.appointment.findMany({
      where: {
        tenantId,
        startsAt: {
          gte: startOfDayInTimeZone(now, options.timeZone),
          lte: endOfDayInTimeZone(now, options.timeZone),
        },
        ...(options.professionalId ? { professionalId: options.professionalId } : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: options.take ?? 8,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        total: true,
        client: { select: { name: true } },
        professional: { select: { name: true } },
        services: { select: { service: { select: { name: true } } } },
      },
    }),
  )

  return rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    clientName: row.client.name,
    professionalName: row.professional.name,
    services: row.services.map((item) => item.service.name),
    total: Number(row.total),
  }))
}
