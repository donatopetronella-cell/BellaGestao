import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthContext } from '@/lib/auth/context'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default async function LoginPage() {
  const context = await getAuthContext()
  if (context) redirect('/painel')

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Bem-vinda de volta</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Entre para acessar a agenda e o painel do seu salão.
        </p>
      </div>

      <LoginForm />

      <p className="text-sm text-[var(--muted-foreground)]">
        Ainda não tem conta?{' '}
        <Link href="/cadastrar" className="font-medium text-brand-600 hover:underline">
          Comece grátis
        </Link>
      </p>
    </div>
  )
}
