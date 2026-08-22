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
