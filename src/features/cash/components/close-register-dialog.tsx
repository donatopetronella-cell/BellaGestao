'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { closeRegisterAction } from '@/server/actions/cash'
import type { CashRegisterSummary } from '../service'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

export function CloseRegisterDialog({ register }: { register: CashRegisterSummary }) {
  const [amount, setAmount] = useState(register.cashInDrawer.toFixed(2))
  const difference = Math.round((Number(amount || 0) - register.cashInDrawer) * 100) / 100

  return (
    <FormDialog
      trigger={
        <Button variant="outline">
          <Lock className="size-4" /> Fechar caixa
        </Button>
      }
      title="Fechar caixa"
      description="Confira o dinheiro na gaveta antes de confirmar."
      action={closeRegisterAction}
      submitLabel="Confirmar fechamento"
      className="max-w-md"
    >
      {(state) => (
        <>
          <input type="hidden" name="registerId" value={register.id} />

          {state.status === 'error' ? (
            <Alert variant="error">{state.message}</Alert>
          ) : null}

          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
            <p className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Esperado em dinheiro</span>
              <span className="font-medium">{formatCurrency(register.cashInDrawer)}</span>
            </p>
          </div>

          <FormField
            label="Valor contado em dinheiro"
            name="closingAmount"
            error={state.fieldErrors?.closingAmount}
          >
            <Input
              id="closingAmount"
              name="closingAmount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </FormField>

          {Math.abs(difference) >= 0.01 ? (
            <Alert variant={difference > 0 ? 'info' : 'error'}>
              Diferença de {formatCurrency(Math.abs(difference))}{' '}
              {difference > 0 ? 'a mais' : 'a menos'} em relação ao esperado.
            </Alert>
          ) : null}

          <FormField label="Observações" name="notes">
            <Textarea id="notes" name="notes" placeholder="Opcional" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
