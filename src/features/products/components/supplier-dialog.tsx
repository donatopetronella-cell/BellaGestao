'use client'

import { Truck } from 'lucide-react'
import { createSupplierAction } from '@/server/actions/products'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'

export function SupplierDialog() {
  return (
    <FormDialog
      trigger={
        <Button variant="outline">
          <Truck className="size-4" /> Novo fornecedor
        </Button>
      }
      title="Novo fornecedor"
      description="Vincule produtos e despesas ao fornecedor correto."
      action={createSupplierAction}
      submitLabel="Criar fornecedor"
      className="max-w-md"
    >
      {(state) => (
        <>
          <FormField label="Nome" name="name" error={state.fieldErrors?.name}>
            <Input id="name" name="name" placeholder="Ex.: Distribuidora Bella" required />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Telefone" name="phone">
              <Input id="phone" name="phone" />
            </FormField>
            <FormField label="E-mail" name="email" error={state.fieldErrors?.email}>
              <Input id="email" name="email" type="email" />
            </FormField>
          </div>
          <FormField label="CNPJ/CPF" name="document">
            <Input id="document" name="document" />
          </FormField>
          <FormField label="Observações" name="notes">
            <Textarea id="notes" name="notes" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
