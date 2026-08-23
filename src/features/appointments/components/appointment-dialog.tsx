'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  availableSlotsAction,
  createAppointmentAction,
  updateAppointmentAction,
} from '@/server/actions/appointments'
import type { AgendaAppointment, AgendaOptionsData } from '../service'
import { ClientPicker, type PickedClient } from './client-picker'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatCurrency, cn } from '@/lib/utils'

export interface AppointmentPrefill {
  date: string
  time?: string
  professionalId?: string
  clientId?: string
  clientName?: string
}

export function AppointmentDialog({
  open,
  onOpenChange,
  options,
  prefill,
  appointment,
  trigger,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  options: AgendaOptionsData
  prefill?: AppointmentPrefill
  appointment?: AgendaAppointment
  trigger?: React.ReactNode
}) {
  const editing = appointment !== undefined

  const [client, setClient] = useState<PickedClient | null>(null)
  const [professionalId, setProfessionalId] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [, startTransition] = useTransition()

  // Reset the form every time the dialog opens, from the edited appointment or
  // from the clicked agenda cell. Several fields are seeded at once, so the
  // rule is suppressed for the block rather than line by line.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    if (appointment) {
      setClient({
        id: appointment.clientId,
        name: appointment.clientName,
        phone: appointment.clientPhone,
      })
      setProfessionalId(appointment.professionalId)
      setServiceIds(appointment.services.map((service) => service.id))
      setDate(appointment.dateKey)
      setTime(
        `${String(Math.floor(appointment.startMinutes / 60)).padStart(2, '0')}:${String(
          appointment.startMinutes % 60,
        ).padStart(2, '0')}`,
      )
      return
    }
    setClient(
      prefill?.clientId && prefill.clientName
        ? { id: prefill.clientId, name: prefill.clientName }
        : null,
    )
    setProfessionalId(prefill?.professionalId ?? options.professionals[0]?.id ?? '')
    setServiceIds([])
    setDate(prefill?.date ?? new Date().toISOString().slice(0, 10))
    setTime(prefill?.time ?? '')
  }, [open, appointment, prefill, options.professionals])
  /* eslint-enable react-hooks/set-state-in-effect */

  const availableServices = useMemo(
    () =>
      options.services.filter(
        (service) =>
          service.professionalIds.length === 0 ||
          service.professionalIds.includes(professionalId),
      ),
    [options.services, professionalId],
  )

  const selected = options.services.filter((service) =>
    serviceIds.includes(service.id),
  )
  const duration = selected.reduce(
    (sum, service) => sum + service.durationMinutes,
    0,
  )
  const total = selected.reduce((sum, service) => sum + service.price, 0)

  useEffect(() => {
    if (!open || !professionalId || !date || duration === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale slots when the inputs that produced them change.
      setSlots([])
      return
    }
    startTransition(async () => {
      const result = await availableSlotsAction({
        date,
        professionalId,
        durationMinutes: duration,
        ...(appointment ? { ignoreAppointmentId: appointment.id } : {}),
      })
      setSlots(result)
    })
  }, [open, professionalId, date, duration, appointment])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={editing ? 'Editar atendimento' : 'Novo atendimento'}
      description="Cliente, profissional, serviços e horário. O total é calculado automaticamente."
      action={editing ? updateAppointmentAction : createAppointmentAction}
      submitLabel={editing ? 'Salvar alterações' : 'Agendar'}
      className="max-h-[90dvh] max-w-2xl overflow-y-auto"
    >
      {(state) => (
        <>
          {editing ? (
            <input type="hidden" name="appointmentId" value={appointment.id} />
          ) : null}

          <ClientPicker
            value={client}
            onChange={setClient}
            error={state.fieldErrors?.clientId}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Profissional"
              name="professionalId"
              error={state.fieldErrors?.professionalId}
            >
              <Select
                id="professionalId"
                name="professionalId"
                value={professionalId}
                onChange={(event) => {
                  setProfessionalId(event.target.value)
                  setServiceIds([])
                }}
                required
              >
                <option value="" disabled>
                  Selecione
                </option>
                {options.professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Data" name="date" error={state.fieldErrors?.date}>
              <Input
                id="date"
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </FormField>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Serviços</legend>
            {state.fieldErrors?.serviceIds ? (
              <p className="text-xs text-danger">{state.fieldErrors.serviceIds[0]}</p>
            ) : null}
            {availableServices.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                Nenhum serviço habilitado para este profissional.
              </p>
            ) : (
              <div className="grid max-h-48 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {availableServices.map((service) => {
                  const checked = serviceIds.includes(service.id)
                  return (
                    <label
                      key={service.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                        checked
                          ? 'border-brand-300 bg-[var(--accent)]'
                          : 'border-[var(--border)] hover:bg-[var(--muted)]',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="serviceIds"
                          value={service.id}
                          checked={checked}
                          onChange={(event) =>
                            setServiceIds((current) =>
                              event.target.checked
                                ? [...current, service.id]
                                : current.filter((id) => id !== service.id),
                            )
                          }
                        />
                        {service.name}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {service.durationMinutes}min · {formatCurrency(service.price)}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Horário"
              name="time"
              error={state.fieldErrors?.time}
              hint={
                duration > 0 && slots.length === 0
                  ? 'Sem horários livres nesta data para este profissional.'
                  : undefined
              }
            >
              <div className="space-y-2">
                <Input
                  id="time"
                  name="time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                />
                {slots.length > 0 ? (
                  <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs transition-colors',
                          time === slot
                            ? 'border-brand-400 bg-[var(--accent)]'
                            : 'border-[var(--border)] hover:bg-[var(--muted)]',
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </FormField>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">Resumo</span>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
                <p className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Duração</span>
                  <span className="font-medium">{duration} min</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Total</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </p>
              </div>
            </div>
          </div>

          <FormField label="Observações" name="notes">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={appointment?.notes ?? ''}
              placeholder="Ex.: cliente pediu para avisar 30 min antes."
            />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
