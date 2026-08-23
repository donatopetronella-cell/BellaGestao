'use client'

import { Plus } from 'lucide-react'
import {
  createServiceAction,
  updateServiceAction,
} from '@/server/actions/services'
import type { ServiceListItem } from '../service'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export interface ServiceDialogOption {
  id: string
  name: string
}

export function ServiceDialog({
  service,
  categories,
  professionals,
  trigger,
}: {
  service?: ServiceListItem & { description?: string | null; categoryId?: string | null }
  categories: ServiceDialogOption[]
  professionals: ServiceDialogOption[]
  trigger?: React.ReactNode
}) {
  const editing = service !== undefined
  const selected = new Set(service?.professionals.map((item) => item.id) ?? [])

  return (
    <FormDialog
      trigger={
        trigger ?? (
          <Button>
            <Plus className="size-4" /> Novo serviço
          </Button>
        )
      }
      title={editing ? 'Editar serviço' : 'Novo serviço'}
      description="Duração, preço e comissão alimentam a agenda, o caixa e o fechamento."
      action={editing ? updateServiceAction : createServiceAction}
      submitLabel={editing ? 'Salvar alterações' : 'Criar serviço'}
      className="max-w-2xl"
    >
      {(state) => (
        <>
          {editing ? (
            <input type="hidden" name="serviceId" value={service.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nome"
              name="name"
              error={state.fieldErrors?.name}
              className="sm:col-span-2"
            >
              <Input
                id="name"
                name="name"
                defaultValue={service?.name}
                placeholder="Ex.: Mechas"
                required
              />
            </FormField>

            <FormField label="Categoria" name="categoryId">
              <Select
                id="categoryId"
                name="categoryId"
                defaultValue={service?.categoryId ?? ''}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Duração (minutos)"
              name="durationMinutes"
              error={state.fieldErrors?.durationMinutes}
            >
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={5}
                max={600}
                step={5}
                defaultValue={service?.durationMinutes ?? 60}
                required
              />
            </FormField>

            <FormField label="Preço (R$)" name="price" error={state.fieldErrors?.price}>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={service?.price ?? ''}
                required
              />
            </FormField>

            <FormField
              label="Custo estimado (R$)"
              name="cost"
              hint="Insumos gastos no serviço."
            >
              <Input
                id="cost"
                name="cost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={service?.cost ?? 0}
              />
            </FormField>

            <FormField label="Tipo de comissão" name="commissionKind">
              <Select
                id="commissionKind"
                name="commissionKind"
                defaultValue={service?.commissionKind ?? 'PERCENT'}
              >
                <option value="PERCENT">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </Select>
            </FormField>

            <FormField
              label="Comissão"
              name="commissionValue"
              hint="Zero usa a comissão padrão do profissional."
            >
              <Input
                id="commissionValue"
                name="commissionValue"
                type="number"
                min={0}
                step="0.01"
                defaultValue={service?.commissionValue ?? 0}
              />
            </FormField>
          </div>

          <FormField label="Descrição" name="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={service?.description ?? ''}
              placeholder="Aparece na agenda online."
            />
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Profissionais habilitados</legend>
            {professionals.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                Cadastre profissionais para habilitá-los neste serviço.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {professionals.map((professional) => (
                  <label
                    key={professional.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="professionalIds"
                      value={professional.id}
                      defaultChecked={selected.has(professional.id)}
                    />
                    {professional.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={service?.isActive ?? true}
            />
            Serviço ativo
          </label>
        </>
      )}
    </FormDialog>
  )
}
