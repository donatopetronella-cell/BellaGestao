'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavSection } from '@/config/navigation'
import { NAV_ICONS } from './nav-icons'
import { cn } from '@/lib/utils'

export function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: NavSection[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6" aria-label="Menu principal">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = NAV_ICONS[item.icon]
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[var(--accent)] font-medium text-[var(--accent-foreground)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
