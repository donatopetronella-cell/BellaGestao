'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import { Alert } from './alert'
import { Button } from './button'
import { SubmitButton } from './submit-button'
import { idleFormState, type FormState } from '@/server/actions/types'

/** Confirmation before a destructive or irreversible action. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  action,
  hiddenFields,
  confirmLabel = 'Confirmar',
  danger = true,
  children,
}: {
  trigger: React.ReactNode
  title: string
  description?: string
  action: (state: FormState, formData: FormData) => Promise<FormState>
  hiddenFields?: Record<string, string>
  confirmLabel?: string
  danger?: boolean
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(action, idleFormState)

  // Closing on a successful submit is a reaction to server state, not
  // derived state, so the rule is suppressed for this effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.status !== 'success' || !open) return
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {state.status === 'error' ? (
            <Alert variant="error">{state.message}</Alert>
          ) : null}
          {children}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Voltar
            </Button>
            <SubmitButton variant={danger ? 'danger' : 'default'}>
              {confirmLabel}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
