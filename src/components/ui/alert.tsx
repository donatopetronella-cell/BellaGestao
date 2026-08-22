import * as React from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const

export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: keyof typeof ICONS
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const Icon = ICONS[variant]
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-lg border p-3 text-sm',
        variant === 'error' && 'border-danger/30 bg-danger/8 text-danger',
        variant === 'success' && 'border-success/30 bg-success/8 text-success',
        variant === 'info' && 'border-[var(--border)] bg-[var(--muted)]',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  )
}
