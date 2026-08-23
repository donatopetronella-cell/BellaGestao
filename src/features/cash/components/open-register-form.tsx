'use client'

import { useActionState } from 'react'
import { openRegisterAction } from '@/server/actions/cash'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export function OpenRegisterForm() {
  const [state, formAction] = useActionState(openRegisterAction, idleFormState)

  return (
    <form action={formAction} className="space-y-4">
      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}

      <FormField
        label="Valor inicial (troco)"
        name="openingAmount"
        error={state.fieldErrors?.openingAmount}
      >
        <Input
          id="openingAmount"
          name="openingAmount"
          type="number"
          min={0}
          step="0.01"
          defaultValue={0}
          required
        />
      </FormField>

      <FormField label="Observações" name="notes">
        <Textarea id="notes" name="notes" placeholder="Opcional" />
      </FormField>

      <SubmitButton className="w-full">Abrir caixa</SubmitButton>
    </form>
  )
}
