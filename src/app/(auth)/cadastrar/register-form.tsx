'use client'

import { useActionState, useState } from 'react'
import { registerAction } from '@/server/actions/auth'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatCurrency, cn } from '@/lib/utils'

interface PlanOption {
  code: string
  name: string
  priceMonthly: number
}

export function RegisterForm({
  plans,
  defaultPlan,
}: {
  plans: PlanOption[]
  defaultPlan: string
}) {
  const [state, formAction] = useActionState(registerAction, idleFormState)
  const [plan, setPlan] = useState(defaultPlan)

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === 'error' && !state.fieldErrors ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}

      <FormField
        label="Nome do salão"
        name="salonName"
        error={state.fieldErrors?.salonName}
      >
        <Input id="salonName" name="salonName" placeholder="Bella Hair Studio" required />
      </FormField>

      <FormField label="Seu nome" name="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </FormField>

      <FormField label="E-mail" name="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>

      <FormField
        label="WhatsApp"
        name="phone"
        hint="Usado para confirmar agendamentos com suas clientes."
        error={state.fieldErrors?.phone}
      >
        <Input id="phone" name="phone" placeholder="(11) 99999-0000" />
      </FormField>

      <FormField
        label="Senha"
        name="password"
        hint="Mínimo de 8 caracteres, com letras e números."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Plano para o teste</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {plans.map((option) => (
            <label
              key={option.code}
              className={cn(
                'cursor-pointer rounded-lg border p-3 text-center text-xs transition-colors',
                plan === option.code
                  ? 'border-brand-500 bg-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--muted)]',
              )}
            >
              <input
                type="radio"
                name="planCode"
                value={option.code}
                checked={plan === option.code}
                onChange={() => setPlan(option.code)}
                className="sr-only"
              />
              <span className="block font-medium">{option.name}</span>
              <span className="text-[var(--muted-foreground)]">
                {formatCurrency(option.priceMonthly)}/mês
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
        <input type="checkbox" name="acceptTerms" className="mt-0.5" required />
        <span>
          Li e aceito os termos de uso e a política de privacidade, incluindo o
          tratamento de dados conforme a LGPD.
        </span>
      </label>
      {state.fieldErrors?.acceptTerms ? (
        <p className="text-xs text-danger">{state.fieldErrors.acceptTerms[0]}</p>
      ) : null}

      <SubmitButton className="w-full" size="lg">
        Criar minha conta
      </SubmitButton>
    </form>
  )
}
