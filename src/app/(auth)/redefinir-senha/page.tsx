import type { Metadata } from 'next'
import { Alert } from '@/components/ui/alert'
import { ResetPasswordForm } from './reset-form'

export const metadata: Metadata = { title: 'Nova senha' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Criar nova senha</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Escolha uma senha forte. Todas as sessões abertas serão encerradas.
        </p>
      </div>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert variant="error" title="Link inválido">
          Solicite um novo link de recuperação na tela de login.
        </Alert>
      )}
    </div>
  )
}
