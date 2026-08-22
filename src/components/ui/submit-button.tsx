'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button, type ButtonProps } from './button'

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}
