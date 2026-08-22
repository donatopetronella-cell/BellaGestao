import Link from 'next/link'
import type { Metadata } from 'next'
import { verifyEmail } from '@/lib/auth/service'
import { presentError } from '@/lib/errors'
import { Alert } from '@/components/ui/alert'

export const metadata: Metadata = { title: 'Verificar e-mail' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let message = 'Link de verificação inválido.'
  let ok = false

  if (token) {
    try {
      await verifyEmail(token)
      ok = true
      message = 'E-mail verificado com sucesso.'
    } catch (error) {
      message = presentError(error).message
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Verificação de e-mail</h1>
      <Alert variant={ok ? 'success' : 'error'}>{message}</Alert>
      <Link href="/painel" className="text-sm font-medium text-brand-600 hover:underline">
        Ir para o painel
      </Link>
    </div>
  )
}
