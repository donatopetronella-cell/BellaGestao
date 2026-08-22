import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthContext } from '@/lib/auth/context'
import { PLANS, TRIAL_DAYS } from '@/config/plans'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Criar conta' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>
}) {
  const context = await getAuthContext()
  if (context) redirect('/painel')

  const { plano } = await searchParams
  const selected =
    PLANS.find((plan) => plan.code === plano)?.code ?? 'profissional'

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">
          Comece grátis por {TRIAL_DAYS} dias
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Sem cartão de crédito. Configure seu salão em poucos minutos.
        </p>
      </div>

      <RegisterForm
        defaultPlan={selected}
        plans={PLANS.map((plan) => ({
          code: plan.code,
          name: plan.name,
          priceMonthly: plan.priceMonthly,
        }))}
      />

      <p className="text-sm text-[var(--muted-foreground)]">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
