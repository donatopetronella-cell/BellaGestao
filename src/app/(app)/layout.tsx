import Link from 'next/link'
import { Bell } from 'lucide-react'
import { requireTenant } from '@/lib/auth/context'
import { getTenantSubscription } from '@/features/billing/queries'
import { visibleNavigation } from '@/config/navigation'
import type { PlanFeature } from '@/config/plans'
import { ROLE_LABELS } from '@/lib/rbac'
import { AppShell } from '@/components/layout/app-shell'
import { GlobalSearch } from '@/components/layout/global-search'
import { TenantSwitcher } from '@/components/layout/tenant-switcher'
import { UserMenu } from '@/components/layout/user-menu'
import { Badge } from '@/components/ui/badge'

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await requireTenant()
  const subscription = await getTenantSubscription(context.tenant.id)

  const sections = visibleNavigation({
    permissions: context.permissions,
    planFeatures: (subscription?.features ?? []) as PlanFeature[],
  })

  const trialDays = subscription?.daysLeftInTrial ?? null

  return (
    <AppShell
      sections={sections}
      sidebarFooter={
        subscription ? (
          <Link
            href="/configuracoes/assinatura"
            className="block rounded-lg bg-[var(--muted)] p-3 text-xs hover:bg-[var(--accent)]"
          >
            <span className="font-medium">Plano {subscription.planName}</span>
            <span className="mt-0.5 block text-[var(--muted-foreground)]">
              {subscription.status === 'TRIAL' && trialDays !== null
                ? `${trialDays} dia(s) de teste restantes`
                : 'Assinatura ativa'}
            </span>
          </Link>
        ) : null
      }
      header={
        <div className="flex flex-1 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TenantSwitcher
              current={{
                tenantId: context.tenant.id,
                tenantName: context.tenant.name,
              }}
              options={context.memberships.map((membership) => ({
                tenantId: membership.tenantId,
                tenantName: membership.tenantName,
              }))}
            />
            {subscription?.status === 'TRIAL' && trialDays !== null ? (
              <Badge variant="warning" className="hidden sm:inline-flex">
                Teste · {trialDays}d
              </Badge>
            ) : null}
          </div>

          <GlobalSearch />

          <div className="flex items-center gap-1">
            <Link
              href="/notificacoes"
              className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              aria-label="Notificações"
            >
              <Bell className="size-5" />
            </Link>
            <UserMenu
              name={context.user.name}
              email={context.user.email}
              avatarUrl={context.user.avatarUrl}
              roleLabel={ROLE_LABELS[context.role]}
              isPlatformAdmin={context.user.isPlatformAdmin}
            />
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  )
}
