'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { resetPasswordAction } from '@/server/actions/auth'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, idleFormState)

  if (state.status === 'success') {
    return (
      <div className="space-y-4">
        <Alert variant="success">{state.message}</Alert>
        <Link href="/entrar" className="text-sm font-medium text-brand-600 hover:underline">
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.status === 'error' && !state.fieldErrors ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}
      <FormField label="Nova senha" name="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField
        label="Confirmar senha"
        name="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <SubmitButton className="w-full" size="lg">
        Salvar nova senha
      </SubmitButton>
    </form>
  )
}
