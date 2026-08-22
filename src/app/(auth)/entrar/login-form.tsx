'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction } from '@/server/actions/auth'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, idleFormState)

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === 'error' && !state.fieldErrors ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}

      <FormField label="E-mail" name="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@salao.com.br"
          required
        />
      </FormField>

      <FormField label="Senha" name="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>

      <div className="flex justify-end">
        <Link
          href="/esqueci-senha"
          className="text-xs text-[var(--muted-foreground)] hover:text-brand-600"
        >
          Esqueci minha senha
        </Link>
      </div>

      <SubmitButton className="w-full" size="lg">
        Entrar
      </SubmitButton>
    </form>
  )
}
