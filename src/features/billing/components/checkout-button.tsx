'use client'

import { useActionState } from 'react'
import { startCheckoutAction } from '@/server/actions/billing'
import { idleFormState } from '@/server/actions/types'
import { SubmitButton } from '@/components/ui/submit-button'

export function CheckoutButton({
  planCode,
  current,
}: {
  planCode: string
  current: boolean
}) {
  const [state, formAction] = useActionState(startCheckoutAction, idleFormState)

  return (
    <form action={formAction}>
      <input type="hidden" name="planCode" value={planCode} />
      <input type="hidden" name="billingCycle" value="monthly" />
      <SubmitButton className="w-full" variant={current ? 'outline' : 'default'} disabled={current}>
        {current ? 'Plano atual' : 'Assinar'}
      </SubmitButton>
      {state.status === 'error' ? <p className="mt-2 text-xs text-danger">{state.message}</p> : null}
    </form>
  )
}
