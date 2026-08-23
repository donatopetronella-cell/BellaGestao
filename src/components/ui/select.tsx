import * as React from 'react'
import { cn } from '@/lib/utils'

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
