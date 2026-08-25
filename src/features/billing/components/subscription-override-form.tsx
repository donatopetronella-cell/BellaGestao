'use client'

import { useActionState } from 'react'
import { overrideSubscriptionAction } from '@/server/actions/admin-billing'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

const STATUS_OPTIONS = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED'] as const

export function SubscriptionOverrideForm({
  tenantId,
  currentStatus,
}: {
  tenantId: string
  currentStatus: string
}) {
  const [state, formAction] = useActionState(overrideSubscriptionAction, idleFormState)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === 'success' ? <Alert variant="success">{state.message}</Alert> : null}

      <FormField label="Status" name="status">
        <Select id="status" name="status" defaultValue={currentStatus}>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Nota (opcional)" name="note">
        <Input id="note" name="note" placeholder="Motivo da alteração" />
      </FormField>
      <SubmitButton className="w-full">Salvar</SubmitButton>
    </form>
  )
}
