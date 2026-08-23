'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, Search, X } from 'lucide-react'
import { searchClientsAction } from '@/server/actions/appointments'
import { Input } from '@/components/ui/input'

export interface PickedClient {
  id: string
  name: string
  phone?: string | null
}

/**
 * Autocomplete by name or phone — the receptionist types three letters and
 * picks the client without leaving the appointment form.
 */
export function ClientPicker({
  value,
  onChange,
  error,
}: {
  value: PickedClient | null
  onChange: (client: PickedClient | null) => void
  error?: string[]
}) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<PickedClient[]>([])
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (term.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale results when the search term is too short to query.
      setResults([])
      return
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const found = await searchClientsAction(term)
        setResults(found)
        setOpen(true)
      })
    }, 250)
    return () => clearTimeout(timeout)
  }, [term])

  useEffect(() => {
    function onClickOutside(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (value) {
    return (
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Cliente</span>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
          <span className="text-sm">
            <span className="font-medium">{value.name}</span>
            {value.phone ? (
              <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                {value.phone}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setTerm('')
            }}
            aria-label="Trocar cliente"
            className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--card)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <input type="hidden" name="clientId" value={value.id} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <label htmlFor="clientSearch" className="text-sm font-medium">
        Cliente
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          id="clientSearch"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Nome ou telefone…"
          autoComplete="off"
          className="pl-9"
        />
      </div>
      {error?.length ? <p className="text-xs text-danger">{error[0]}</p> : null}

      {open && results.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(client)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[var(--muted)]"
              >
                <span>
                  {client.name}
                  {client.phone ? (
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                      {client.phone}
                    </span>
                  ) : null}
                </span>
                <Check className="size-3.5 opacity-0" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {pending ? (
        <p className="text-xs text-[var(--muted-foreground)]">Buscando…</p>
      ) : null}
      {!pending && term.trim().length >= 2 && results.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          Nenhuma cliente encontrada. Cadastre em Clientes.
        </p>
      ) : null}
    </div>
  )
}
