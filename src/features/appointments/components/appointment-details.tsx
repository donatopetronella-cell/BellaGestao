'use client'

import { useActionState, useState } from 'react'
import {
  CalendarClock,
  CopyPlus,
  Pencil,
  Wallet,
} from 'lucide-react'
import {
  changeAppointmentStatusAction,
  duplicateAppointmentAction,
} from '@/server/actions/appointments'
import { idleFormState } from '@/server/actions/types'
import {
  APPOINTMENT_STATUS_FLOW,
  APPOINTMENT_STATUS_LABELS,
} from '../status'
import type { AgendaAppointment, AgendaOptionsData } from '../service'
import { AppointmentDialog } from './appointment-dialog'
import { FinishDialog } from './finish-dialog'
import { AppointmentStatusBadge } from '@/features/dashboard/components/appointment-status-badge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

export interface AgendaPermissions {
  canUpdate: boolean
  canCancel: boolean
  canFinish: boolean
  canCreate: boolean
}

export function AppointmentDetails({
  appointment,
  open,
  onOpenChange,
  options,
  permissions,
  cashRegisterOpen,
  timeZone,
}: {
  appointment: AgendaAppointment
  open: boolean
  onOpenChange: (open: boolean) => void
  options: AgendaOptionsData
  permissions: AgendaPermissions
  cashRegisterOpen: boolean
  timeZone: string
}) {
  const [statusState, statusAction] = useActionState(
    changeAppointmentStatusAction,
    idleFormState,
  )
  const [duplicateState, duplicateAction] = useActionState(
    duplicateAppointmentAction,
    idleFormState,
  )
  const [editing, setEditing] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const nextStatuses = APPOINTMENT_STATUS_FLOW[appointment.status].filter(
    (status) => status !== 'CANCELED' && status !== 'NO_SHOW',
  )
  const canFinishNow =
    permissions.canFinish &&
    ['CONFIRMED', 'ARRIVED', 'IN_SERVICE', 'PENDING'].includes(appointment.status)

  const feedback =
    statusState.status !== 'idle'
      ? statusState
      : duplicateState.status !== 'idle'
        ? duplicateState
        : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{appointment.clientName}</DialogTitle>
            <DialogDescription>
              {formatDate(appointment.startsAt, timeZone)} ·{' '}
              {formatTime(appointment.startsAt, timeZone)} às{' '}
              {formatTime(appointment.endsAt, timeZone)} ·{' '}
              {appointment.professionalName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {feedback ? (
              <Alert variant={feedback.status === 'error' ? 'error' : 'success'}>
                {feedback.message}
              </Alert>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <AppointmentStatusBadge status={appointment.status} />
              <span className="font-display text-xl">
                {formatCurrency(appointment.total)}
              </span>
            </div>

            <ul className="space-y-1 rounded-lg border border-[var(--border)] p-3 text-sm">
              {appointment.services.map((service) => (
                <li key={service.id} className="flex justify-between gap-3">
                  <span>{service.name}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {formatCurrency(service.price)}
                  </span>
                </li>
              ))}
            </ul>

            {appointment.notes ? (
              <p className="rounded-lg bg-[var(--muted)] p-3 text-sm">
                {appointment.notes}
              </p>
            ) : null}

            {permissions.canUpdate && nextStatuses.length > 0 ? (
              <form action={statusAction} className="space-y-2">
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  Mudar status
                </p>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((status) => (
                    <Button
                      key={status}
                      type="submit"
                      name="status"
                      value={status}
                      variant="outline"
                      size="sm"
                    >
                      {APPOINTMENT_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </form>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              {canFinishNow ? (
                <Button onClick={() => setFinishing(true)}>
                  <Wallet className="size-4" /> Finalizar
                </Button>
              ) : null}

              {permissions.canUpdate &&
              !['FINISHED', 'CANCELED', 'NO_SHOW'].includes(appointment.status) ? (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" /> Editar
                </Button>
              ) : null}

              {permissions.canCreate ? (
                <form action={duplicateAction}>
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="weeksAhead" value="1" />
                  <SubmitButton variant="outline" size="default">
                    <CopyPlus className="size-4" /> Repetir em 7 dias
                  </SubmitButton>
                </form>
              ) : null}

              {permissions.canCancel &&
              appointment.status !== 'FINISHED' &&
              appointment.status !== 'CANCELED' ? (
                <Button variant="ghost" onClick={() => setCancelling((value) => !value)}>
                  <CalendarClock className="size-4" /> Cancelar / falta
                </Button>
              ) : null}
            </div>

            {cancelling ? (
              <form
                action={statusAction}
                className="space-y-2 rounded-lg border border-danger/30 p-3"
              >
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <Textarea
                  name="reason"
                  placeholder="Motivo (opcional) — fica registrado no histórico da cliente."
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" name="status" value="CANCELED" variant="danger" size="sm">
                    Cancelar atendimento
                  </Button>
                  <Button type="submit" name="status" value="NO_SHOW" variant="outline" size="sm">
                    Marcar falta
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AppointmentDialog
        open={editing}
        onOpenChange={(next) => {
          setEditing(next)
          if (!next) onOpenChange(false)
        }}
        options={options}
        appointment={appointment}
      />

      <FinishDialog
        appointment={appointment}
        open={finishing}
        onOpenChange={(next) => {
          setFinishing(next)
          if (!next) onOpenChange(false)
        }}
        cashRegisterOpen={cashRegisterOpen}
      />
    </>
  )
}
