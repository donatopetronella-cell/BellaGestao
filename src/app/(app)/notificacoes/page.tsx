import type { Metadata } from 'next'
import { Bell } from 'lucide-react'
import { requireTenant } from '@/lib/auth/context'
import { withTenant } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Notificações' }

export default async function NotificationsPage() {
  const context = await requireTenant()

  const notifications = await withTenant(
    context.tenant.id,
    (tx) =>
      tx.notification.findMany({
        where: {
          tenantId: context.tenant.id,
          OR: [{ userId: context.user.id }, { userId: null }],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          body: true,
          type: true,
          readAt: true,
          createdAt: true,
        },
      }),
    context.user.id,
  )

  return (
    <>
      <PageHeader
        title="Notificações"
        description="Novos agendamentos, cancelamentos, estoque baixo, aniversários e comissões."
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação por enquanto"
          description="Os avisos do sistema aparecem aqui assim que houver movimento no salão."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-[var(--border)]">
              {notifications.map((notification) => (
                <li key={notification.id} className="flex gap-3 p-4">
                  <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                    <Bell className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {notification.body ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {formatDate(notification.createdAt, context.tenant.timezone)} ·{' '}
                      {formatTime(notification.createdAt, context.tenant.timezone)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
