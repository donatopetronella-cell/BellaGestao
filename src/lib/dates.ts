/**
 * Timezone-aware date helpers. Every salon has its own timezone, so "today"
 * must be resolved in the tenant's zone, not in the server's.
 */

function partsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Offset (ms) between the given zone and UTC at that instant. */
function offsetMs(date: Date, timeZone: string): number {
  const parts = partsInTimeZone(date, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** UTC instant matching local midnight of `date` in `timeZone`. */
export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const parts = partsInTimeZone(date, timeZone)
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0)
  return new Date(utcGuess - offsetMs(date, timeZone))
}

export function endOfDayInTimeZone(date: Date, timeZone: string): Date {
  const start = startOfDayInTimeZone(date, timeZone)
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
}

export function startOfMonthInTimeZone(date: Date, timeZone: string): Date {
  const parts = partsInTimeZone(date, timeZone)
  const utcGuess = Date.UTC(parts.year, parts.month - 1, 1, 0, 0, 0)
  return new Date(utcGuess - offsetMs(date, timeZone))
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setUTCMonth(result.getUTCMonth() + months)
  return result
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

export type DashboardRange = 'today' | '7d' | '30d' | 'month' | 'year'

export const RANGE_LABELS: Record<DashboardRange, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  month: 'Este mês',
  year: 'Este ano',
}

export interface ResolvedRange {
  from: Date
  to: Date
  label: string
}

export function resolveRange(
  range: DashboardRange,
  timeZone: string,
  now = new Date(),
): ResolvedRange {
  const todayStart = startOfDayInTimeZone(now, timeZone)
  const todayEnd = endOfDayInTimeZone(now, timeZone)

  switch (range) {
    case 'today':
      return { from: todayStart, to: todayEnd, label: RANGE_LABELS.today }
    case '7d':
      return {
        from: startOfDayInTimeZone(addDays(now, -6), timeZone),
        to: todayEnd,
        label: RANGE_LABELS['7d'],
      }
    case '30d':
      return {
        from: startOfDayInTimeZone(addDays(now, -29), timeZone),
        to: todayEnd,
        label: RANGE_LABELS['30d'],
      }
    case 'year': {
      const parts = partsInTimeZone(now, timeZone)
      return {
        from: startOfDayInTimeZone(
          new Date(Date.UTC(parts.year, 0, 1, 12)),
          timeZone,
        ),
        to: todayEnd,
        label: RANGE_LABELS.year,
      }
    }
    case 'month':
    default:
      return {
        from: startOfMonthInTimeZone(now, timeZone),
        to: todayEnd,
        label: RANGE_LABELS.month,
      }
  }
}

export function isDashboardRange(value: string): value is DashboardRange {
  return ['today', '7d', '30d', 'month', 'year'].includes(value)
}

/** Wall-clock parts of an instant, in the given zone. */
export function zonedParts(date: Date, timeZone: string) {
  return partsInTimeZone(date, timeZone)
}

/** Minutes since midnight of an instant, in the given zone. */
export function minutesInDay(date: Date, timeZone: string): number {
  const parts = partsInTimeZone(date, timeZone)
  return parts.hour * 60 + parts.minute
}

/** `2026-08-25` as seen in the given zone. */
export function toDateKey(date: Date, timeZone: string): string {
  const parts = partsInTimeZone(date, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
    parts.day,
  ).padStart(2, '0')}`
}

/**
 * Converts a local date (`2026-08-25`) plus minutes since midnight, as typed by
 * someone sitting in the salon, into the UTC instant to persist.
 * Two passes so a DST boundary resolves correctly.
 */
export function zonedToUtc(
  dateKey: string,
  minutes: number,
  timeZone: string,
): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${dateKey}`)
  }
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0) + minutes * 60_000
  const firstPass = new Date(guess - offsetMs(new Date(guess), timeZone))
  return new Date(guess - offsetMs(firstPass, timeZone))
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60, Math.round(minutes)))
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(
    normalized % 60,
  ).padStart(2, '0')}`
}

/** Weekday index (0 = Sunday) of an instant, in the given zone. */
export function zonedWeekday(date: Date, timeZone: string): number {
  const parts = partsInTimeZone(date, timeZone)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
}

/** Monday-first week containing `dateKey`. */
export function weekDateKeys(dateKey: string): string[] {
  const [year, month, day] = dateKey.split('-').map(Number)
  const base = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1))
  const weekday = base.getUTCDay()
  const monday = new Date(base)
  monday.setUTCDate(base.getUTCDate() - ((weekday + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday)
    current.setUTCDate(monday.getUTCDate() + index)
    return current.toISOString().slice(0, 10)
  })
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const base = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1))
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

/** `25/08` for the agenda header. */
export function formatDateKeyShort(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  return `${day}/${month}`
}
