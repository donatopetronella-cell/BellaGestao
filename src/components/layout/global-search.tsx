'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Global search entry point. Phase 2 wires it to the clients/appointments
 * search endpoint; today it routes the term to the clients list.
 */
export function GlobalSearch() {
  const router = useRouter()
  const [term, setTerm] = useState('')

  return (
    <form
      role="search"
      className="relative hidden w-full max-w-sm md:block"
      onSubmit={(event) => {
        event.preventDefault()
        if (term.trim().length === 0) return
        router.push(`/clientes?busca=${encodeURIComponent(term.trim())}`)
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Buscar cliente, telefone, serviço…"
        aria-label="Busca global"
        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm placeholder:text-[var(--muted-foreground)]"
      />
    </form>
  )
}
