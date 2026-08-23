'use client'

import { Plus } from 'lucide-react'
import {
  createProfessionalAction,
  updateProfessionalAction,
} from '@/server/actions/professionals'
import type { ProfessionalListItem } from '../service'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'

export function ProfessionalDialog({
  professional,
  trigger,
}: {
  professional?: ProfessionalListItem
  trigger?: React.ReactNode
}) {
  const editing = professional !== undefined

  return (
    <FormDialog
      trigger={
        trigger ?? (
          <Button>
            <Plus className="size-4" /> Novo profissional
          </Button>
        )
      }
      title={editing ? 'Editar profissional' : 'Novo profissional'}
      description="A jornada de trabalho é configurada na ficha do profissional."
      action={editing ? updateProfessionalAction : createProfessionalAction}
      submitLabel={editing ? 'Salvar alterações' : 'Cadastrar'}
    >
      {(state) => (
        <>
          {editing ? (
            <input type="hidden" name="professionalId" value={professional.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nome"
              name="name"
              error={state.fieldErrors?.name}
              className="sm:col-span-2"
            >
              <Input id="name" name="name" defaultValue={professional?.name} required />
            </FormField>

            <FormField label="Especialidade" name="specialty">
              <Input
                id="specialty"
                name="specialty"
                defaultValue={professional?.specialty ?? ''}
                placeholder="Ex.: Colorista"
              />
            </FormField>

            <FormField
              label="Comissão padrão (%)"
              name="commissionPercent"
              error={state.fieldErrors?.commissionPercent}
            >
              <Input
                id="commissionPercent"
                name="commissionPercent"
                type="number"
                min={0}
                max={100}
                step="0.5"
                defaultValue={professional?.commissionPercent ?? 40}
              />
            </FormField>

            <FormField label="Telefone" name="phone" error={state.fieldErrors?.phone}>
              <Input id="phone" name="phone" defaultValue={professional?.phone ?? ''} />
            </FormField>

            <FormField label="E-mail" name="email" error={state.fieldErrors?.email}>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={professional?.email ?? ''}
              />
            </FormField>

            <FormField
              label="Cor na agenda"
              name="color"
              hint="Usada nos cartões da agenda."
            >
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={professional?.color ?? '#b04d76'}
                className="h-10 w-20 p-1"
              />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={professional?.isActive ?? true}
            />
            Profissional ativo
          </label>
        </>
      )}
    </FormDialog>
  )
}
