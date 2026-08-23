'use client'

import { useActionState, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { rescheduleAppointmentAction } from '@/server/actions/appointments'
import { idleFormState } from '@/server/actions/types'
import type { AgendaAppointment, AgendaDay, AgendaOptionsData } from '../service'
import type { AgendaPermissions } from './appointment-details'
import { AppointmentDetails } from './appointment-details'
import { AppointmentDialog, type AppointmentPrefill } from './appointment-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Alert } from '@/components/ui/alert'
import { formatCurrency, cn } from '@/lib/utils'

const STATUS_STYLES: Record<AgendaAppointment['status'], string> = {
  PENDING: 'border-warning/40 bg-warning/10',
  CONFIRMED: 'border-brand-300 bg-brand-50',
  ARRIVED: 'border-[var(--border)] bg-[var(--muted)]',
  IN_SERVICE: 'border-[var(--border)] bg-[var(--muted)]',
  FINISHED: 'border-success/40 bg-success/10',
  CANCELED: 'border-danger/30 bg-danger/8 opacity-60 line-through',
  NO_SHOW: 'border-danger/30 bg-danger/8 opacity-60',
}

const SLOT_PX = 22

function timeLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`
}

export function AgendaDayView({
  day,
  options,
  permissions,
  cashRegisterOpen,
  timeZone,
}: {
  day: AgendaDay
  options: AgendaOptionsData
  permissions: AgendaPermissions
  cashRegisterOpen: boolean
  timeZone: string
}) {
  const [selected, setSelected] = useState<AgendaAppointment | null>(null)
  const [prefill, setPrefill] = useState<AppointmentPrefill | null>(null)
  const [creating, setCreating] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    professionalId: string
    minutes: number
  } | null>(null)
  const [rescheduleState, rescheduleAction] = useActionState(
    rescheduleAppointmentAction,
    idleFormState,
  )

  const totalMinutes = day.closeMin - day.openMin
  const gridHeight = (totalMinutes / 30) * SLOT_PX

  const hourMarks = useMemo(() => {
    const marks: number[] = []
    for (
      let minute = Math.ceil(day.openMin / 60) * 60;
      minute <= day.closeMin;
      minute += 60
    ) {
      marks.push(minute)
    }
    return marks
  }, [day.openMin, day.closeMin])

  const columns = day.columns.length > 0 ? day.columns : []

  function offset(minutes: number): number {
    return ((minutes - day.openMin) / 30) * SLOT_PX
  }

  function handleDrop(professionalId: string, minutes: number): void {
    if (!draggingId) return
    const snapped = Math.round(minutes / day.slotMinutes) * day.slotMinutes
    const formData = new FormData()
    formData.set('appointmentId', draggingId)
    formData.set('date', day.dateKey)
    formData.set('time', timeLabel(snapped))
    formData.set('professionalId', professionalId)
    rescheduleAction(formData)
    setDraggingId(null)
    setDropTarget(null)
  }

  if (day.isClosed) {
    return (
      <Alert variant="info" title="O salão está fechado neste dia">
        Ajuste os horários de funcionamento em Configurações se isso não estiver
        correto.
      </Alert>
    )
  }

  if (columns.length === 0) {
    return (
      <Alert variant="info" title="Nenhum profissional ativo">
        Cadastre profissionais para começar a montar a agenda.
      </Alert>
    )
  }

  return (
    <div className="overflow-x-auto">
      {rescheduleState.status === 'error' ? (
        <Alert variant="error" className="mb-3">
          {rescheduleState.message}
        </Alert>
      ) : null}

      <div
        className="grid min-w-[720px] gap-px bg-[var(--border)]"
        style={{ gridTemplateColumns: `4rem repeat(${columns.length}, 1fr)` }}
      >
        <div className="sticky top-0 z-10 bg-[var(--card)]" />
        {columns.map((column) => (
          <div
            key={column.professionalId}
            className="sticky top-0 z-10 flex items-center gap-2 bg-[var(--card)] p-2"
          >
            <Avatar name={column.professionalName} className="size-7 text-[10px]" />
            <span className="truncate text-sm font-medium">
              {column.professionalName}
            </span>
          </div>
        ))}

        <div className="relative bg-[var(--card)]" style={{ height: gridHeight }}>
          {hourMarks.map((minute) => (
            <span
              key={minute}
              className="absolute right-2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]"
              style={{ top: offset(minute) }}
            >
              {timeLabel(minute)}
            </span>
          ))}
        </div>

        {columns.map((column) => {
          const appointments = day.appointments.filter(
            (appointment) => appointment.professionalId === column.professionalId,
          )
          const isOutsideShift = column.startMin === null

          return (
            <div
              key={column.professionalId}
              className="relative bg-[var(--card)]"
              style={{ height: gridHeight }}
              onDragOver={(event) => {
                if (!draggingId) return
                event.preventDefault()
                const rect = event.currentTarget.getBoundingClientRect()
                const relativeY = event.clientY - rect.top
                const minutes = day.openMin + (relativeY / SLOT_PX) * 30
                setDropTarget({ professionalId: column.professionalId, minutes })
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (!dropTarget) return
                handleDrop(column.professionalId, dropTarget.minutes)
              }}
            >
              {isOutsideShift ? (
                <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--muted)_0px,var(--muted)_8px,transparent_8px,transparent_16px)] opacity-40" />
              ) : (
                <>
                  <div
                    className="absolute inset-x-0 bg-[var(--muted)]/60"
                    style={{
                      top: offset(day.openMin),
                      height: offset(column.startMin!) - offset(day.openMin),
                    }}
                  />
                  <div
                    className="absolute inset-x-0 bg-[var(--muted)]/60"
                    style={{
                      top: offset(column.endMin!),
                      height: gridHeight - offset(column.endMin!),
                    }}
                  />
                  {column.breakStartMin !== null && column.breakEndMin !== null ? (
                    <div
                      className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,var(--muted)_0px,var(--muted)_6px,transparent_6px,transparent_12px)]"
                      style={{
                        top: offset(column.breakStartMin),
                        height: offset(column.breakEndMin) - offset(column.breakStartMin),
                      }}
                    />
                  ) : null}
                </>
              )}

              {/* click-to-create grid lines, every 30 minutes */}
              {permissions.canCreate &&
                Array.from(
                  { length: Math.floor(totalMinutes / 30) },
                  (_, index) => day.openMin + index * 30,
                ).map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className="absolute inset-x-0 border-t border-transparent hover:bg-[var(--accent)]/40"
                    style={{ top: offset(minute), height: SLOT_PX }}
                    onClick={() => {
                      setPrefill({
                        date: day.dateKey,
                        time: timeLabel(minute),
                        professionalId: column.professionalId,
                      })
                      setCreating(true)
                    }}
                    aria-label={`Novo atendimento às ${timeLabel(minute)} com ${column.professionalName}`}
                  />
                ))}

              {dropTarget?.professionalId === column.professionalId ? (
                <div
                  className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-brand-400"
                  style={{
                    top: offset(
                      Math.round(dropTarget.minutes / day.slotMinutes) * day.slotMinutes,
                    ),
                    height: SLOT_PX * 2,
                  }}
                />
              ) : null}

              {appointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  draggable={permissions.canUpdate && appointment.status !== 'FINISHED'}
                  onDragStart={() => setDraggingId(appointment.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => setSelected(appointment)}
                  className={cn(
                    'absolute inset-x-1 overflow-hidden rounded-lg border p-1.5 text-left text-xs shadow-sm transition-opacity',
                    STATUS_STYLES[appointment.status],
                    draggingId === appointment.id && 'opacity-40',
                  )}
                  style={{
                    top: offset(appointment.startMinutes),
                    height: Math.max(SLOT_PX, offset(appointment.startMinutes + appointment.durationMinutes) - offset(appointment.startMinutes)) - 2,
                  }}
                >
                  <p className="truncate font-medium">{appointment.clientName}</p>
                  <p className="truncate text-[var(--muted-foreground)]">
                    {appointment.services.map((service) => service.name).join(', ')}
                  </p>
                  {appointment.durationMinutes >= 45 ? (
                    <p className="truncate text-[var(--muted-foreground)]">
                      {formatCurrency(appointment.total)}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {permissions.canCreate ? (
        <button
          type="button"
          onClick={() => {
            setPrefill({ date: day.dateKey })
            setCreating(true)
          }}
          className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          <Plus className="size-4" /> Novo atendimento
        </button>
      ) : null}

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

      <AppointmentDialog
        open={creating}
        onOpenChange={setCreating}
        options={options}
        prefill={prefill ?? { date: day.dateKey }}
      />
    </div>
  )
}
