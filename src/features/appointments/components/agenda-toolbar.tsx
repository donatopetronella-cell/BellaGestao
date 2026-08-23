'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

export type AgendaView = 'dia' | 'semana'

export function AgendaToolbar({
  view,
  dateKey,
  professionalId,
  professionals,
  previousHref,
  nextHref,
  todayHref,
  timeZone,
}: {
  view: AgendaView
  dateKey: string
  professionalId: string
  professionals: Array<{ id: string; name: string }>
  previousHref: string
  nextHref: string
  todayHref: string
  timeZone: string
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon">
          <Link href={previousHref} aria-label="Período anterior">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={todayHref}>Hoje</Link>
        </Button>
        <Button asChild variant="outline" size="icon">
          <Link href={nextHref} aria-label="Próximo período">
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      <p className="font-medium">
        {formatDate(new Date(`${dateKey}T12:00:00.000Z`), timeZone)}
      </p>

      <div className="ml-auto flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
          <Link
            href={buildHref(view, 'dia', dateKey, professionalId)}
            className={tabClass(view === 'dia')}
          >
            Dia
          </Link>
          <Link
            href={buildHref(view, 'semana', dateKey, professionalId)}
            className={tabClass(view === 'semana')}
          >
            Semana
          </Link>
        </div>

        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="visao" value={view} />
          <input type="hidden" name="data" value={dateKey} />
          <Select
            name="profissional"
            defaultValue={professionalId}
            className="h-9 w-44"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option value="">Toda a equipe</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </Select>
        </form>
      </div>
    </div>
  )
}

function tabClass(active: boolean): string {
  return `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
  }`
}

function buildHref(
  _current: AgendaView,
  target: AgendaView,
  dateKey: string,
  professionalId: string,
): string {
  const query = new URLSearchParams({ visao: target, data: dateKey })
  if (professionalId) query.set('profissional', professionalId)
  return `/agenda?${query.toString()}`
}
