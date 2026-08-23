import type { Metadata } from 'next'
import { requireAnyPermission } from '@/lib/auth/context'
import {
  getAgendaDay,
  getAgendaOptions,
  getAgendaWeek,
} from '@/features/appointments/service'
import { getOpenRegister } from '@/features/cash/service'
import { AgendaDayView } from '@/features/appointments/components/agenda-day-view'
import { AgendaWeekView } from '@/features/appointments/components/agenda-week-view'
import {
  AgendaToolbar,
  type AgendaView,
} from '@/features/appointments/components/agenda-toolbar'
import { PageHeader } from '@/components/layout/page-header'
import {
  isValidDateKey,
  shiftDateKey,
  toDateKey,
  weekDateKeys,
} from '@/lib/dates'

export const metadata: Metadata = { title: 'Agenda' }

interface PageProps {
  searchParams: Promise<{
    visao?: string
    data?: string
    profissional?: string
    cliente?: string
  }>
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const context = await requireAnyPermission(['agenda.view', 'agenda.view_own'])
  const params = await searchParams

  const view: AgendaView = params.visao === 'semana' ? 'semana' : 'dia'
  const dateKey =
    params.data && isValidDateKey(params.data)
      ? params.data
      : toDateKey(new Date(), context.tenant.timezone)

  const restrictedToOwn = !context.permissions.has('agenda.view')
  const professionalId = restrictedToOwn
    ? (context.professionalId ?? '')
    : (params.profissional ?? '')

  const permissions = {
    canUpdate: context.permissions.has('agenda.update'),
    canCancel: context.permissions.has('agenda.cancel'),
    canFinish: context.permissions.has('agenda.finish'),
    canCreate: context.permissions.has('agenda.create'),
  }

  const [options, register] = await Promise.all([
    getAgendaOptions(context.tenant.id),
    getOpenRegister(context.tenant.id),
  ])

  const visibleProfessionals = restrictedToOwn
    ? options.professionals.filter((professional) => professional.id === professionalId)
    : options.professionals

  const step = view === 'semana' ? 7 : 1
  const previousDateKey = shiftDateKey(dateKey, -step)
  const nextDateKey = shiftDateKey(dateKey, step)
  const todayKey = toDateKey(new Date(), context.tenant.timezone)

  const query = (target: { visao?: AgendaView; data: string }) => {
    const search = new URLSearchParams({
      visao: target.visao ?? view,
      data: target.data,
    })
    if (professionalId) search.set('profissional', professionalId)
    return `/agenda?${search.toString()}`
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Visão diária e semanal, com arrastar e soltar para reagendar."
      />

      <AgendaToolbar
        view={view}
        dateKey={dateKey}
        professionalId={professionalId}
        professionals={visibleProfessionals}
        previousHref={query({ data: previousDateKey })}
        nextHref={query({ data: nextDateKey })}
        todayHref={query({ data: todayKey })}
        timeZone={context.tenant.timezone}
      />

      {view === 'dia' ? (
        <DayAgenda
          tenantId={context.tenant.id}
          dateKey={dateKey}
          professionalId={professionalId}
          options={{ ...options, professionals: visibleProfessionals }}
          permissions={permissions}
          cashRegisterOpen={register !== null}
          timeZone={context.tenant.timezone}
        />
      ) : (
        <WeekAgenda
          tenantId={context.tenant.id}
          dateKey={dateKey}
          professionalId={professionalId}
          options={{ ...options, professionals: visibleProfessionals }}
          permissions={permissions}
          cashRegisterOpen={register !== null}
          timeZone={context.tenant.timezone}
        />
      )}
    </>
  )
}

async function DayAgenda({
  tenantId,
  dateKey,
  professionalId,
  options,
  permissions,
  cashRegisterOpen,
  timeZone,
}: {
  tenantId: string
  dateKey: string
  professionalId: string
  options: Awaited<ReturnType<typeof getAgendaOptions>>
  permissions: {
    canUpdate: boolean
    canCancel: boolean
    canFinish: boolean
    canCreate: boolean
  }
  cashRegisterOpen: boolean
  timeZone: string
}) {
  const day = await getAgendaDay(tenantId, {
    dateKey,
    timeZone,
    professionalId: professionalId || null,
  })

  return (
    <AgendaDayView
      day={day}
      options={options}
      permissions={permissions}
      cashRegisterOpen={cashRegisterOpen}
      timeZone={timeZone}
    />
  )
}

async function WeekAgenda({
  tenantId,
  dateKey,
  professionalId,
  options,
  permissions,
  cashRegisterOpen,
  timeZone,
}: {
  tenantId: string
  dateKey: string
  professionalId: string
  options: Awaited<ReturnType<typeof getAgendaOptions>>
  permissions: {
    canUpdate: boolean
    canCancel: boolean
    canFinish: boolean
    canCreate: boolean
  }
  cashRegisterOpen: boolean
  timeZone: string
}) {
  const days = await getAgendaWeek(tenantId, {
    dateKeys: weekDateKeys(dateKey),
    timeZone,
    professionalId: professionalId || null,
  })

  return (
    <AgendaWeekView
      days={days}
      options={options}
      permissions={permissions}
      cashRegisterOpen={cashRegisterOpen}
      timeZone={timeZone}
    />
  )
}
