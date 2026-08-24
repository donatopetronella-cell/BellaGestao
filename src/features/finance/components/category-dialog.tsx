'use client'

import { FolderPlus } from 'lucide-react'
import { createFinancialCategoryAction } from '@/server/actions/finance'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function CategoryDialog() {
  return (
    <FormDialog
      trigger={
        <Button variant="outline">
          <FolderPlus className="size-4" /> Nova categoria
        </Button>
      }
      title="Nova categoria financeira"
      description="Agrupa receitas ou despesas nos relatórios."
      action={createFinancialCategoryAction}
      submitLabel="Criar categoria"
      className="max-w-md"
    >
      {(state) => (
        <>
          <FormField label="Nome" name="name" error={state.fieldErrors?.name}>
            <Input id="name" name="name" placeholder="Ex.: Aluguel" required />
          </FormField>
          <FormField label="Tipo" name="kind">
            <Select id="kind" name="kind" defaultValue="EXPENSE">
              <option value="EXPENSE">Despesa</option>
              <option value="REVENUE">Receita</option>
            </Select>
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
