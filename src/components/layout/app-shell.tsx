'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import type { NavSection } from '@/config/navigation'
import { Logo } from './logo'
import { SidebarNav } from './sidebar-nav'
import { cn } from '@/lib/utils'

/**
 * Responsive frame: fixed sidebar on desktop, slide-over on mobile.
 * The header content is rendered by the server layout and passed in.
 */
export function AppShell({
  sections,
  header,
  sidebarFooter,
  children,
}: {
  sections: NavSection[]
  header: React.ReactNode
  sidebarFooter?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-[var(--border)] bg-[var(--card)] lg:flex lg:h-dvh lg:flex-col lg:sticky lg:top-0">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav sections={sections} />
        </div>
        {sidebarFooter ? (
          <div className="border-t border-[var(--border)] p-3">{sidebarFooter}</div>
        ) : null}
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
        </div>
        {sidebarFooter ? (
          <div className="border-t border-[var(--border)] p-3">{sidebarFooter}</div>
        ) : null}
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/85 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 hover:bg-[var(--muted)] lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          {header}
        </header>
        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
