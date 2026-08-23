'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AgendaOptionsData, AgendaWeekDay } from '../service'
import type { AgendaPermissions } from './appointment-details'
import { AppointmentDetails } from './appointment-details'
import type { AgendaAppointment } from '../service'
import { AppointmentStatusBadge } from '@/features/dashboard/components/appointment-status-badge'
import { WEEKDAY_SHORT, formatDateKeyShort } from '@/lib/dates'
import { formatCurrency, formatTime, cn } from '@/lib/utils'

export function AgendaWeekView({
  days,
  options,
  permissions,
  cashRegisterOpen,
  timeZone,
}: {
  days: AgendaWeekDay[]
  options: AgendaOptionsData
  permissions: AgendaPermissions
  cashRegisterOpen: boolean
  timeZone: string
}) {
  const [selected, setSelected] = useState<AgendaAppointment | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => (
        <div
          key={day.dateKey}
          className={cn(
            'flex flex-col rounded-xl2 border border-[var(--border)] bg-[var(--card)]',
            day.dateKey === today && 'border-brand-300',
          )}
        >
          <Link
            href={`/agenda?visao=dia&data=${day.dateKey}`}
            className="flex items-center justify-between border-b border-[var(--border)] p-3 hover:bg-[var(--muted)]"
          >
            <span className="text-sm font-medium">
              {WEEKDAY_SHORT[day.weekday]} · {formatDateKeyShort(day.dateKey)}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {day.appointments.length}
            </span>
          </Link>

          <div className="flex-1 space-y-1.5 p-2">
            {day.appointments.length === 0 ? (
              <p className="p-2 text-center text-xs text-[var(--muted-foreground)]">
                Sem atendimentos
              </p>
            ) : (
              day.appointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => setSelected(appointment)}
                  className="w-full rounded-lg border border-[var(--border)] p-2 text-left text-xs hover:bg-[var(--muted)]"
                >
                  <p className="flex items-center justify-between gap-1">
                    <span className="font-medium">
                      {formatTime(appointment.startsAt, timeZone)}
                    </span>
                    <AppointmentStatusBadge status={appointment.status} />
                  </p>
                  <p className="truncate">{appointment.clientName}</p>
                  <p className="truncate text-[var(--muted-foreground)]">
                    {appointment.professionalName}
                  </p>
                </button>
              ))
            )}
          </div>

          {day.total > 0 ? (
            <p className="border-t border-[var(--border)] p-2 text-right text-xs font-medium text-[var(--muted-foreground)]">
              {formatCurrency(day.total)}
            </p>
          ) : null}
        </div>
      ))}

      {selected ? (
        <AppointmentDetails
          appointment={selected}
          open={selected !== null}
          onOpenChange={(open) => !open && setSelected(null)}
          options={options}
          permissions={permissions}
          cashRegisterOpen={cashRegisterOpen}
          timeZone={timeZone}
        />
      ) : null}
    </div>
  )
}
