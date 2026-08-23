'use client'

import { Search, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { cn } from '@/lib/utils'

/**
 * Debounced search bound to a query-string parameter, so the list stays a
 * server component and the result is shareable/bookmarkable.
 */
export function SearchInput({
  paramName = 'busca',
  placeholder = 'Buscar…',
  className,
}: {
  paramName?: string
  placeholder?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get(paramName) ?? '')

  useEffect(() => {
    const current = searchParams.get(paramName) ?? ''
    if (current === value) return

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) params.set(paramName, value.trim())
      else params.delete(paramName)
      params.delete('pagina')
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }, 350)

    return () => clearTimeout(timeout)
  }, [value, searchParams, paramName, pathname, router])

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-busy={pending}
        className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-9 text-sm placeholder:text-[var(--muted-foreground)]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
