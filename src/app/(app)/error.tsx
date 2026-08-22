'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Last-resort boundary. Technical details stay in the server logs; the user
 * sees language they can act on.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[bellagestao] render error', error.digest ?? error.message)
  }, [error])

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning">
          <AlertTriangle className="size-6" />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-2xl">Algo não saiu como esperado</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Não foi possível carregar esta tela. Tente novamente em instantes.
          </p>
          {error.digest ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Código de referência: {error.digest}
            </p>
          ) : null}
        </div>
        <Button onClick={reset}>Tentar novamente</Button>
      </CardContent>
    </Card>
  )
}
