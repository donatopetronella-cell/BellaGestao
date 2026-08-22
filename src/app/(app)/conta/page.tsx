import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth/context'
import { ROLE_LABELS } from '@/lib/rbac'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChangePasswordForm } from './change-password-form'

export const metadata: Metadata = { title: 'Minha conta' }

export default async function AccountPage() {
  const context = await requireAuth()

  return (
    <>
      <PageHeader
        title="Minha conta"
        description="Seus dados de acesso e segurança."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados de acesso</CardTitle>
            <CardDescription>Informações vinculadas ao seu login.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">Nome</dt>
                <dd className="font-medium">{context.user.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">E-mail</dt>
                <dd className="font-medium">{context.user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">E-mail verificado</dt>
                <dd>
                  {context.user.emailVerifiedAt ? (
                    <Badge variant="success">Verificado</Badge>
                  ) : (
                    <Badge variant="warning">Pendente</Badge>
                  )}
                </dd>
              </div>
              {context.role ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted-foreground)]">Perfil</dt>
                  <dd className="font-medium">{ROLE_LABELS[context.role]}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">Estabelecimentos</dt>
                <dd className="font-medium">{context.memberships.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>
              Use pelo menos 8 caracteres, com letras e números.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
