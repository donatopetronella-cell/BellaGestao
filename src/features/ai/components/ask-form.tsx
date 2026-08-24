'use client'

import { useActionState, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { askBellaIaAction } from '@/server/actions/ai'
import { idleFormState } from '@/server/actions/types'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

const SUGGESTIONS = [
  'Como está o faturamento deste mês?',
  'Quantas clientes estão inativas?',
  'Quais produtos estão com estoque baixo?',
  'Qual profissional mais faturou este mês?',
]

export function AskForm() {
  const [state, formAction] = useActionState(askBellaIaAction, idleFormState)
  const [question, setQuestion] = useState('')

  useEffect(() => {
    if (state.status !== 'success') return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing the input after a successful answer.
    setQuestion('')
  }, [state])

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex gap-2">
        <Input
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Pergunte sobre o seu salão…"
          required
          className="flex-1"
        />
        <SubmitButton>
          <Sparkles className="size-4" /> Perguntar
        </SubmitButton>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setQuestion(suggestion)}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === 'success' && state.message ? (
        <Alert variant="success" className="whitespace-pre-line">
          {state.message}
        </Alert>
      ) : null}
    </div>
  )
}
