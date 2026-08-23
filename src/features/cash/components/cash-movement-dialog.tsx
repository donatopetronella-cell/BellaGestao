'use client'

import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { addCashMovementAction } from '@/server/actions/cash'
import { PAYMENT_METHOD_LABELS } from '@/validators/cash'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function CashMovementDialog({
  type,
}: {
  type: 'IN' | 'OUT' | 'WITHDRAWAL' | 'REINFORCEMENT'
}) {
  const isEntry = type === 'IN' || type === 'REINFORCEMENT'
  const title = { IN: 'Entrada', OUT: 'Saída', WITHDRAWAL: 'Sangria', REINFORCEMENT: 'Reforço' }[type]

  return (
    <FormDialog
      trigger={
        <Button variant="outline" size="sm">
          {isEntry ? (
            <ArrowUpCircle className="size-4" />
          ) : (
            <ArrowDownCircle className="size-4" />
          )}
          {title}
        </Button>
      }
      title={title}
      description={
        isEntry
          ? 'Registra dinheiro adicionado ao caixa.'
          : 'Registra dinheiro retirado do caixa.'
      }
      action={addCashMovementAction}
      submitLabel="Registrar"
      className="max-w-sm"
    >
      {(state) => (
        <>
          <input type="hidden" name="type" value={type} />

          <FormField label="Valor" name="amount" error={state.fieldErrors?.amount}>
            <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required />
          </FormField>

          <FormField label="Forma" name="method">
            <Select id="method" name="method" defaultValue="CASH">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Descrição"
            name="description"
            error={state.fieldErrors?.description}
          >
            <Input id="description" name="description" required />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
