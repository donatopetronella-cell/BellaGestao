import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1">
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p
            className={cn(
              'font-display text-2xl',
              tone === 'success' && 'text-success',
              tone === 'warning' && 'text-warning',
              tone === 'danger' && 'text-danger',
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
            <Icon className="size-4" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
