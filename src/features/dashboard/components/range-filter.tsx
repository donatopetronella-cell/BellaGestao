import Link from 'next/link'
import { RANGE_LABELS, type DashboardRange } from '@/lib/dates'
import { cn } from '@/lib/utils'

const ORDER: DashboardRange[] = ['today', '7d', '30d', 'month', 'year']

export function RangeFilter({
  active,
  basePath = '/painel',
}: {
  active: DashboardRange
  basePath?: string
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--card)] p-1"
      role="group"
      aria-label="Período"
    >
      {ORDER.map((range) => (
        <Link
          key={range}
          href={`${basePath}?periodo=${range}`}
          aria-current={range === active ? 'true' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            range === active
              ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
          )}
        >
          {RANGE_LABELS[range]}
        </Link>
      ))}
    </div>
  )
}
