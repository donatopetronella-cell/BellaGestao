'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { Calendar, Check, Clock, Scissors, User } from 'lucide-react'
import { createPublicBookingAction, getPublicSlotsAction } from '@/server/actions/booking'
import { idleFormState } from '@/server/actions/types'
import type { PublicService } from '../service'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatCurrency } from '@/lib/utils'

function todayKey(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

export function BookingForm({
  tenantId,
  timeZone,
  services,
}: {
  tenantId: string
  timeZone: string
  services: PublicService[]
}) {
  const [service, setService] = useState<PublicService | null>(null)
  const [professionalId, setProfessionalId] = useState<string | null>(null)
  const [date, setDate] = useState(todayKey(timeZone))
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [time, setTime] = useState<string | null>(null)
  const [state, formAction] = useActionState(createPublicBookingAction, idleFormState)

  useEffect(() => {
    if (!service || !professionalId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale slots when the selection is incomplete.
      setSlots([])
      return
    }
    let cancelled = false
    setLoadingSlots(true)
    setTime(null)
    getPublicSlotsAction(tenantId, service.id, professionalId, date, timeZone).then((found) => {
      if (!cancelled) {
        setSlots(found)
        setLoadingSlots(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [tenantId, service, professionalId, date, timeZone])

  const minDate = useMemo(() => todayKey(timeZone), [timeZone])

  if (state.status === 'success') {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Check className="size-10 text-success" />
          <h2 className="text-lg font-semibold">Agendamento confirmado!</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Você recebe a confirmação pelo telefone informado. Até breve!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Scissors className="size-4" /> Serviço
        </h2>
        <div className="grid gap-2">
          {services.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setService(item)
                setProfessionalId(item.professionals[0]?.id ?? null)
              }}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                service?.id === item.id
                  ? 'border-brand-400 bg-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--muted)]'
              }`}
            >
              <span>
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                  {item.durationMinutes} min
                </span>
              </span>
              <span className="font-medium">{formatCurrency(item.price)}</span>
            </button>
          ))}
        </div>
      </section>

      {service ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <User className="size-4" /> Profissional
          </h2>
          <div className="flex flex-wrap gap-2">
            {service.professionals.map((professional) => (
              <button
                key={professional.id}
                type="button"
                onClick={() => setProfessionalId(professional.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  professionalId === professional.id
                    ? 'border-brand-400 bg-[var(--accent)]'
                    : 'border-[var(--border)] hover:bg-[var(--muted)]'
                }`}
              >
                {professional.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {service && professionalId ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="size-4" /> Data e horário
          </h2>
          <Input
            type="date"
            min={minDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          {loadingSlots ? (
            <p className="text-xs text-[var(--muted-foreground)]">Carregando horários…</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Nenhum horário livre nesta data.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    time === slot
                      ? 'border-brand-400 bg-[var(--accent)]'
                      : 'border-[var(--border)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <Clock className="size-3.5" /> {slot}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {service && professionalId && time ? (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="professionalId" value={professionalId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="time" value={time} />
          <input type="hidden" name="timeZone" value={timeZone} />

          {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}

          <div className="space-y-1.5">
            <label htmlFor="clientName" className="text-sm font-medium">
              Nome
            </label>
            <Input id="clientName" name="clientName" required />
            {state.fieldErrors?.clientName ? (
              <p className="text-xs text-danger">{state.fieldErrors.clientName[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clientPhone" className="text-sm font-medium">
              WhatsApp
            </label>
            <Input id="clientPhone" name="clientPhone" placeholder="(11) 99999-0000" required />
            {state.fieldErrors?.clientPhone ? (
              <p className="text-xs text-danger">{state.fieldErrors.clientPhone[0]}</p>
            ) : null}
          </div>

          <SubmitButton className="w-full">Confirmar agendamento</SubmitButton>
        </form>
      ) : null}
    </div>
  )
}
