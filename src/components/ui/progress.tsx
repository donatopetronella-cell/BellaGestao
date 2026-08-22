import { cn } from '@/lib/utils'

export function Progress({
  value,
  className,
  label,
}: {
  value: number
  className?: string
  label?: string
}) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]', className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
