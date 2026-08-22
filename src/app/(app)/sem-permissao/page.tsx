import Link from 'next/link'
import type { Metadata } from 'next'
import { ShieldAlert } from 'lucide-react'
import { requireTenant } from '@/lib/auth/context'
import { ROLE_LABELS } from '@/lib/rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Sem permissão' }

export default async function ForbiddenPage() {
  const context = await requireTenant()

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <ShieldAlert className="size-6" />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-2xl">Você não tem acesso a esta área</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Seu perfil é <strong>{ROLE_LABELS[context.role]}</strong>. Peça a quem
            administra o salão para liberar esta permissão.
          </p>
        </div>
        <Button asChild>
          <Link href="/painel">Voltar ao painel</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
