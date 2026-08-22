import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({
  className,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm shadow-xs placeholder:text-[var(--muted-foreground)]',
        className,
      )}
      {...props}
    />
  )
}
