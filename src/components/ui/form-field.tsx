import * as React from 'react'
import { Label } from './label'
import { cn } from '@/lib/utils'

export function FormField({
  label,
  name,
  error,
  hint,
  children,
  className,
}: {
  label: string
  name: string
  error?: string[]
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  const errorId = `${name}-error`
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !error?.length ? (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
      {error?.length ? (
        <p id={errorId} className="text-xs text-danger">
          {error[0]}
        </p>
      ) : null}
    </div>
  )
}
