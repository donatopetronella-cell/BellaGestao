'use client'

import { useActionState, useEffect } from 'react'
import { CheckCircle2, Trash2 } from 'lucide-react'
import {
  deleteExpenseAction,
  deleteRevenueAction,
  settleExpenseAction,
  settleRevenueAction,
} from '@/server/actions/finance'
import { idleFormState } from '@/server/actions/types'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function RevenueRowActions({
  revenueId,
  status,
  isAutomatic,
}: {
  revenueId: string
  status: 'PENDING' | 'SETTLED' | 'CANCELED'
  isAutomatic: boolean
}) {
  const [settleState, settleAction] = useActionState(settleRevenueAction, idleFormState)

  useEffect(() => {
    if (settleState.status === 'error') console.error(settleState.message)
  }, [settleState])

  return (
    <div className="flex items-center justify-end gap-1">
      {status === 'PENDING' ? (
        <form action={settleAction}>
          <input type="hidden" name="revenueId" value={revenueId} />
          <Button type="submit" variant="ghost" size="icon" aria-label="Marcar como recebida">
            <CheckCircle2 className="size-4" />
          </Button>
        </form>
      ) : null}
      {!isAutomatic ? (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon" aria-label="Remover receita" className="text-danger">
              <Trash2 className="size-4" />
            </Button>
          }
          title="Remover receita?"
          description="Esta ação não pode ser desfeita."
          action={deleteRevenueAction}
          hiddenFields={{ revenueId }}
          confirmLabel="Remover"
        />
      ) : null}
    </div>
  )
}

export function ExpenseRowActions({
  expenseId,
  status,
}: {
  expenseId: string
  status: 'PENDING' | 'SETTLED' | 'CANCELED'
}) {
  const [settleState, settleAction] = useActionState(settleExpenseAction, idleFormState)

  useEffect(() => {
    if (settleState.status === 'error') console.error(settleState.message)
  }, [settleState])

  return (
    <div className="flex items-center justify-end gap-1">
      {status === 'PENDING' ? (
        <form action={settleAction}>
          <input type="hidden" name="expenseId" value={expenseId} />
          <Button type="submit" variant="ghost" size="icon" aria-label="Marcar como paga">
            <CheckCircle2 className="size-4" />
          </Button>
        </form>
      ) : null}
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" aria-label="Remover despesa" className="text-danger">
            <Trash2 className="size-4" />
          </Button>
        }
        title="Remover despesa?"
        description="Esta ação não pode ser desfeita."
        action={deleteExpenseAction}
        hiddenFields={{ expenseId }}
        confirmLabel="Remover"
      />
    </div>
  )
}
