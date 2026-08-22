'use client'

import { useActionState } from 'react'
import { saveOpeningHoursAction } from '@/server/actions/settings'
import { idleFormState } from '@/server/actions/types'
import type { OpeningHourInput } from '../service'
import { Alert } from '@/components/ui/alert'
import { SubmitButton } from '@/components/ui/submit-button'

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
]

function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function OpeningHoursForm({ initial }: { initial: OpeningHourInput[] }) {
  const [state, formAction] = useActionState(saveOpeningHoursAction, idleFormState)

  const byWeekday = new Map(initial.map((hour) => [hour.weekday, hour]))

  return (
    <form action={formAction} className="space-y-4">
      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === 'success' ? (
        <Alert variant="success">{state.message}</Alert>
      ) : null}

      <div className="space-y-2">
        {WEEKDAY_LABELS.map((label, weekday) => {
          const current = byWeekday.get(weekday)
          const closed = current?.isClosed ?? weekday === 0
          return (
            <div
              key={label}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] p-3"
            >
              <span className="w-24 text-sm font-medium">{label}</span>
              <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <input type="checkbox" name={`closed-${weekday}`} defaultChecked={closed} />
                Fechado
              </label>
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  name={`start-${weekday}`}
                  defaultValue={toTime(current?.startMin ?? 9 * 60)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2"
                  aria-label={`Abertura ${label}`}
                />
                <span className="text-[var(--muted-foreground)]">até</span>
                <input
                  type="time"
                  name={`end-${weekday}`}
                  defaultValue={toTime(current?.endMin ?? 18 * 60)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2"
                  aria-label={`Fechamento ${label}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <SubmitButton>Salvar horários</SubmitButton>
    </form>
  )
}
