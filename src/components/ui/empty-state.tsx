import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-[var(--border)] px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
