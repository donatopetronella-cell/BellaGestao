import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Pagination({
  page,
  perPage,
  total,
  buildHref,
}: {
  page: number
  perPage: number
  total: number
  buildHref: (page: number) => string
}) {
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  if (total === 0) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)

  return (
    <nav
      className="mt-4 flex items-center justify-between gap-3 text-sm"
      aria-label="Paginação"
    >
      <p className="text-[var(--muted-foreground)]">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Página anterior">
          <ChevronLeft className="size-4" />
        </PageLink>
        <span className="px-2 text-[var(--muted-foreground)]">
          {page} / {lastPage}
        </span>
        <PageLink
          href={buildHref(page + 1)}
          disabled={page >= lastPage}
          label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </nav>
  )
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  const className = cn(
    'flex size-8 items-center justify-center rounded-lg border border-[var(--border)]',
    disabled
      ? 'pointer-events-none opacity-40'
      : 'hover:bg-[var(--muted)]',
  )
  if (disabled) {
    return (
      <span className={className} aria-hidden="true">
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  )
}
