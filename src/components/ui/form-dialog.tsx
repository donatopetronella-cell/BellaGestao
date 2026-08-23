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

/**
 * Dialog + Server Action + field errors, the shape every CRUD screen uses.
 * `children` receives the current state so fields can render their errors.
 */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = 'Salvar',
  children,
  onSuccess,
  className,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode
  title: string
  description?: string
  action: (state: FormState, formData: FormData) => Promise<FormState>
  submitLabel?: string
  children: (state: FormState) => React.ReactNode
  onSuccess?: () => void
  className?: string
  /** Controlled mode: used by screens that open the dialog from a cell click. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean): void => {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const [state, formAction] = useActionState(action, idleFormState)

  // Closing the dialog after a successful submit is a reaction to server
  // state, not a derived-value calculation, so the rule is suppressed here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (state.status !== 'success' || !open) return
    setOpen(false)
    onSuccess?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form action={formAction} className="space-y-4" noValidate>
          {state.status === 'error' && !state.fieldErrors ? (
            <Alert variant="error">{state.message}</Alert>
          ) : null}
          {children(state)}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
