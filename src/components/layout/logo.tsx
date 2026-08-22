import { cn } from '@/lib/utils'

export function Logo({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
        B
      </span>
      {!compact ? (
        <span className="font-display text-lg font-semibold tracking-tight">
          Bella<span className="text-brand-600">Gestão</span>
        </span>
      ) : null}
    </span>
  )
}
