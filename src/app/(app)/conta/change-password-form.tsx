'use client'

import { useActionState } from 'react'
import { changePasswordAction } from '@/server/actions/settings'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, idleFormState)

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === 'error' && !state.fieldErrors ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}
      {state.status === 'success' ? (
        <Alert variant="success">{state.message}</Alert>
      ) : null}

      <FormField
        label="Senha atual"
        name="currentPassword"
        error={state.fieldErrors?.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      <FormField label="Nova senha" name="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField
        label="Confirmar nova senha"
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

      <SubmitButton>Alterar senha</SubmitButton>
    </form>
  )
}
