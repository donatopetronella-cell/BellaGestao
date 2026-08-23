'use client'

import { useActionState } from 'react'
import { saveWorkingHoursAction } from '@/server/actions/professionals'
import { idleFormState } from '@/server/actions/types'
import type { WorkingHour } from '../service'
import { Alert } from '@/components/ui/alert'
import { SubmitButton } from '@/components/ui/submit-button'
import { WEEKDAY_LABELS, minutesToTime } from '@/lib/dates'

export function WorkingHoursForm({
  professionalId,
  hours,
}: {
  professionalId: string
  hours: WorkingHour[]
}) {
  const [state, formAction] = useActionState(saveWorkingHoursAction, idleFormState)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="professionalId" value={professionalId} />

      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === 'success' ? (
        <Alert variant="success">{state.message}</Alert>
      ) : null}

      <div className="space-y-2">
        {hours.map((hour) => (
          <div
            key={hour.weekday}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] p-3"
          >
            <label className="flex w-32 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name={`working-${hour.weekday}`}
                defaultChecked={hour.isWorking}
              />
              {WEEKDAY_LABELS[hour.weekday]}
            </label>

            <div className="flex items-center gap-2 text-sm">
              <input
                type="time"
                name={`start-${hour.weekday}`}
                defaultValue={minutesToTime(hour.startMin)}
                aria-label={`Início ${WEEKDAY_LABELS[hour.weekday]}`}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2"
              />
              <span className="text-[var(--muted-foreground)]">até</span>
              <input
                type="time"
                name={`end-${hour.weekday}`}
                defaultValue={minutesToTime(hour.endMin)}
                aria-label={`Fim ${WEEKDAY_LABELS[hour.weekday]}`}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                name={`break-${hour.weekday}`}
                defaultChecked={hour.breakStartMin !== null}
              />
              Intervalo
            </label>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="time"
                name={`breakStart-${hour.weekday}`}
                defaultValue={minutesToTime(hour.breakStartMin ?? 12 * 60)}
                aria-label={`Início do intervalo ${WEEKDAY_LABELS[hour.weekday]}`}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2"
              />
              <span className="text-[var(--muted-foreground)]">até</span>
              <input
                type="time"
                name={`breakEnd-${hour.weekday}`}
                defaultValue={minutesToTime(hour.breakEndMin ?? 13 * 60)}
                aria-label={`Fim do intervalo ${WEEKDAY_LABELS[hour.weekday]}`}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-2"
              />
            </div>
          </div>
        ))}
      </div>

      <SubmitButton>Salvar jornada</SubmitButton>
    </form>
  )
}
