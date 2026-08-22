'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { finishOnboardingAction } from '@/server/actions/settings'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function FinishOnboardingButton({ completed }: { completed: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (completed) {
    return (
      <Alert variant="success">
        Onboarding concluído. Você pode ajustar tudo em Configurações.
      </Alert>
    )
  }

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await finishOnboardingAction()
            if (result.status === 'error') setError(result.message ?? null)
            else router.push('/painel')
          })
        }
      >
        Concluir e ir para o painel
      </Button>
    </div>
  )
}
