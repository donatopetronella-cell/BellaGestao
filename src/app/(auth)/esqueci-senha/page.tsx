import Link from 'next/link'
import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-form'

export const metadata: Metadata = { title: 'Recuperar senha' }

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Recuperar senha</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-sm text-[var(--muted-foreground)]">
        <Link href="/entrar" className="font-medium text-brand-600 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  )
}
