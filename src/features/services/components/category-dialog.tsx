'use client'

import { FolderPlus } from 'lucide-react'
import { createServiceCategoryAction } from '@/server/actions/services'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'

export function CategoryDialog() {
  return (
    <FormDialog
      trigger={
        <Button variant="outline">
          <FolderPlus className="size-4" /> Nova categoria
        </Button>
      }
      title="Nova categoria"
      description="Agrupa os serviços no catálogo e nos relatórios."
      action={createServiceCategoryAction}
      submitLabel="Criar categoria"
      className="max-w-md"
    >
      {(state) => (
        <FormField label="Nome" name="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" placeholder="Ex.: Coloração" required />
        </FormField>
      )}
    </FormDialog>
  )
}
