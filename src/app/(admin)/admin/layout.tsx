import Link from 'next/link'
import { requirePlatformAdmin } from '@/lib/auth/context'
import { Logo } from '@/components/layout/logo'

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePlatformAdmin()

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/85 px-4 backdrop-blur lg:px-6">
        <div className="flex items-center gap-4">
          <Logo compact />
          <span className="text-sm font-medium text-[var(--muted-foreground)]">Painel Admin</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/tenants" className="hover:underline">
              Salões
            </Link>
            <Link href="/admin/plans" className="hover:underline">
              Planos
            </Link>
          </nav>
        </div>
        <Link href="/painel" className="text-sm text-[var(--muted-foreground)] hover:underline">
          Voltar ao app
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">{children}</main>
    </div>
  )
}
