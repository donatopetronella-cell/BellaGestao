'use client'

import { useActionState } from 'react'
import { forgotPasswordAction } from '@/server/actions/auth'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, idleFormState)

  if (state.status === 'success') {
    return <Alert variant="success">{state.message}</Alert>
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === 'error' && !state.fieldErrors ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}
      <FormField label="E-mail" name="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <SubmitButton className="w-full" size="lg">
        Enviar link
      </SubmitButton>
    </form>
  )
}
