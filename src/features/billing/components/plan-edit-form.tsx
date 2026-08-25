'use client'

import { useActionState } from 'react'
import { updatePlanAction } from '@/server/actions/admin-billing'
import { idleFormState } from '@/server/actions/types'
import { PLAN_FEATURES } from '@/config/plans'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export interface PlanEditFormValues {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number | null
  trialDays: number
  sortOrder: number
  isActive: boolean
  features: string[]
  limitBranches: number
  limitProfessionals: number
  limitUsers: number
  limitWhatsappMessagesPerMonth: number
  limitAiQuestionsPerMonth: number
}

export function PlanEditForm({ plan }: { plan: PlanEditFormValues }) {
  const [state, formAction] = useActionState(updatePlanAction, idleFormState)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={plan.id} />
      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === 'success' ? <Alert variant="success">{state.message}</Alert> : null}

      <FormField label="Nome" name="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={plan.name} required />
      </FormField>

      <FormField label="Descrição" name="description">
        <Input id="description" name="description" defaultValue={plan.description} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Preço mensal (R$)" name="priceMonthly" error={state.fieldErrors?.priceMonthly}>
          <Input
            id="priceMonthly"
            name="priceMonthly"
            type="number"
            step="0.01"
            min={0}
            defaultValue={plan.priceMonthly}
            required
          />
        </FormField>
        <FormField label="Preço anual (R$)" name="priceYearly">
          <Input
            id="priceYearly"
            name="priceYearly"
            type="number"
            step="0.01"
            min={0}
            defaultValue={plan.priceYearly ?? undefined}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Dias de teste" name="trialDays">
          <Input id="trialDays" name="trialDays" type="number" min={0} defaultValue={plan.trialDays} />
        </FormField>
        <FormField label="Ordem" name="sortOrder">
          <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={plan.sortOrder} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Filiais" name="limitBranches">
          <Input id="limitBranches" name="limitBranches" type="number" min={0} defaultValue={plan.limitBranches} />
        </FormField>
        <FormField label="Profissionais" name="limitProfessionals">
          <Input
            id="limitProfessionals"
            name="limitProfessionals"
            type="number"
            min={0}
            defaultValue={plan.limitProfessionals}
          />
        </FormField>
        <FormField label="Usuários" name="limitUsers">
          <Input id="limitUsers" name="limitUsers" type="number" min={0} defaultValue={plan.limitUsers} />
        </FormField>
        <FormField label="Mensagens WhatsApp/mês" name="limitWhatsappMessagesPerMonth">
          <Input
            id="limitWhatsappMessagesPerMonth"
            name="limitWhatsappMessagesPerMonth"
            type="number"
            min={0}
            defaultValue={plan.limitWhatsappMessagesPerMonth}
          />
        </FormField>
        <FormField label="Perguntas Bella IA/mês" name="limitAiQuestionsPerMonth">
          <Input
            id="limitAiQuestionsPerMonth"
            name="limitAiQuestionsPerMonth"
            type="number"
            min={0}
            defaultValue={plan.limitAiQuestionsPerMonth}
          />
        </FormField>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Recursos liberados</p>
        <div className="grid grid-cols-2 gap-2">
          {PLAN_FEATURES.map((feature) => (
            <label key={feature} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="features"
                value={feature}
                defaultChecked={plan.features.includes(feature)}
              />
              {feature}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={plan.isActive} />
        Plano ativo (visível para novas assinaturas)
      </label>

      <SubmitButton>Salvar plano</SubmitButton>
    </form>
  )
}
