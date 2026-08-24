'use client'

import { Plus } from 'lucide-react'
import { createExpenseAction } from '@/server/actions/finance'
import { PAYMENT_METHOD_LABELS } from '@/validators/cash'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function ExpenseDialog({
  categories,
  suppliers,
}: {
  categories: Array<{ id: string; name: string }>
  suppliers: Array<{ id: string; name: string }>
}) {
  return (
    <FormDialog
      trigger={
        <Button variant="outline">
          <Plus className="size-4" /> Nova despesa
        </Button>
      }
      title="Lançar despesa"
      description="Contas, compras e despesas recorrentes do salão."
      action={createExpenseAction}
      submitLabel="Lançar despesa"
      className="max-w-md"
    >
      {(state) => (
        <>
          <FormField label="Descrição" name="description" error={state.fieldErrors?.description}>
            <Input id="description" name="description" placeholder="Ex.: Conta de luz" required />
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

            <FormField label="Fornecedor" name="supplierId">
              <Select id="supplierId" name="supplierId" defaultValue="">
                <option value="">Sem fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
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
              <Select id="status" name="status" defaultValue="PENDING">
                <option value="PENDING">A pagar</option>
                <option value="SETTLED">Paga</option>
              </Select>
            </FormField>

            <FormField label="Vencimento" name="dueDate">
              <Input id="dueDate" name="dueDate" type="date" />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isRecurring" />
            Despesa recorrente (mensal)
          </label>
        </>
      )}
    </FormDialog>
  )
}
