'use client'

import { Plus } from 'lucide-react'
import { createRevenueAction } from '@/server/actions/finance'
import { PAYMENT_METHOD_LABELS } from '@/validators/cash'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function RevenueDialog({
  categories,
}: {
  categories: Array<{ id: string; name: string }>
}) {
  return (
    <FormDialog
      trigger={
        <Button>
          <Plus className="size-4" /> Nova receita
        </Button>
      }
      title="Lançar receita"
      description="Entradas avulsas — vendas e atendimentos já são lançados automaticamente."
      action={createRevenueAction}
      submitLabel="Lançar receita"
      className="max-w-md"
    >
      {(state) => (
        <>
          <FormField label="Descrição" name="description" error={state.fieldErrors?.description}>
            <Input id="description" name="description" placeholder="Ex.: Aluguel de cadeira" required />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Valor (R$)" name="amount" error={state.fieldErrors?.amount}>
              <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required />
            </FormField>

            <FormField label="Categoria" name="categoryId">
              <Select id="categoryId" name="categoryId" defaultValue="">
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Forma de pagamento" name="method">
              <Select id="method" name="method" defaultValue="">
                <option value="">—</option>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Status" name="status">
              <Select id="status" name="status" defaultValue="SETTLED">
                <option value="SETTLED">Recebida</option>
                <option value="PENDING">A receber</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Vencimento" name="dueDate" hint="Opcional, para receitas a receber.">
            <Input id="dueDate" name="dueDate" type="date" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
