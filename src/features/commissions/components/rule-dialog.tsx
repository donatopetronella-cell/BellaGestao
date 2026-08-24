'use client'

import { Plus } from 'lucide-react'
import { createCommissionRuleAction, updateCommissionRuleAction } from '@/server/actions/commissions'
import type { CommissionRuleRow } from '../service'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export interface RuleDialogOption {
  id: string
  name: string
}

export function RuleDialog({
  rule,
  professionals,
  products,
  trigger,
}: {
  rule?: CommissionRuleRow
  professionals: RuleDialogOption[]
  products: RuleDialogOption[]
  trigger?: React.ReactNode
}) {
  const editing = rule !== undefined

  return (
    <FormDialog
      trigger={
        trigger ?? (
          <Button>
            <Plus className="size-4" /> Nova regra
          </Button>
        )
      }
      title={editing ? 'Editar regra de comissão' : 'Nova regra de comissão'}
      description="Aplicada na venda de produtos no PDV. Regras mais específicas (produto + profissional) têm prioridade."
      action={editing ? updateCommissionRuleAction : createCommissionRuleAction}
      submitLabel={editing ? 'Salvar alterações' : 'Criar regra'}
      className="max-w-lg"
    >
      {(state) => (
        <>
          {editing ? <input type="hidden" name="ruleId" value={rule.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Profissional" name="professionalId" hint="Vazio = todos.">
              <Select
                id="professionalId"
                name="professionalId"
                defaultValue={rule?.professionalId ?? ''}
              >
                <option value="">Todos os profissionais</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Produto" name="productId" hint="Vazio = todos.">
              <Select id="productId" name="productId" defaultValue={rule?.productId ?? ''}>
                <option value="">Todos os produtos</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tipo" name="kind">
              <Select id="kind" name="kind" defaultValue={rule?.kind ?? 'PERCENT'}>
                <option value="PERCENT">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </Select>
            </FormField>

            <FormField label="Valor" name="value" error={state.fieldErrors?.value}>
              <Input
                id="value"
                name="value"
                type="number"
                min={0}
                step="0.01"
                defaultValue={rule?.value ?? ''}
                required
              />
            </FormField>

            <FormField
              label="Prioridade"
              name="priority"
              hint="Maior número vence em caso de empate."
            >
              <Input
                id="priority"
                name="priority"
                type="number"
                min={0}
                max={100}
                defaultValue={rule?.priority ?? 0}
              />
            </FormField>

            <input type="hidden" name="appliesTo" value="PRODUCT" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={rule?.isActive ?? true} />
            Regra ativa
          </label>
        </>
      )}
    </FormDialog>
  )
}
