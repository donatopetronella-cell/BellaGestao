'use client'

import { useActionState } from 'react'
import { saveSalonAction } from '@/server/actions/settings'
import { idleFormState } from '@/server/actions/types'
import type { SalonSetupView } from '../service'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Fortaleza',
  'America/Manaus',
  'America/Cuiaba',
  'America/Belem',
  'America/Recife',
]

export function SalonForm({ initial }: { initial: SalonSetupView }) {
  const [state, formAction] = useActionState(saveSalonAction, idleFormState)

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === 'error' && !state.fieldErrors ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}
      {state.status === 'success' ? (
        <Alert variant="success">{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nome do salão" name="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={initial.name} required />
        </FormField>
        <FormField label="Razão social" name="legalName">
          <Input id="legalName" name="legalName" defaultValue={initial.legalName} />
        </FormField>
        <FormField label="CNPJ / CPF" name="document">
          <Input id="document" name="document" defaultValue={initial.document} />
        </FormField>
        <FormField label="E-mail" name="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" defaultValue={initial.email} />
        </FormField>
        <FormField label="Telefone" name="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" defaultValue={initial.phone} />
        </FormField>
        <FormField label="WhatsApp" name="whatsapp" error={state.fieldErrors?.whatsapp}>
          <Input id="whatsapp" name="whatsapp" defaultValue={initial.whatsapp} />
        </FormField>
        <FormField label="Fuso horário" name="timezone">
          <select
            id="timezone"
            name="timezone"
            defaultValue={initial.timezone}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-sm"
          >
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Moeda" name="currency">
          <select
            id="currency"
            name="currency"
            defaultValue={initial.currency}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-sm"
          >
            <option value="BRL">Real (R$)</option>
            <option value="USD">Dólar (US$)</option>
            <option value="EUR">Euro (€)</option>
          </select>
        </FormField>
        <FormField
          label="Intervalo entre atendimentos (min)"
          name="appointmentIntervalMin"
          error={state.fieldErrors?.appointmentIntervalMin}
        >
          <Input
            id="appointmentIntervalMin"
            name="appointmentIntervalMin"
            type="number"
            min={5}
            max={120}
            defaultValue={initial.appointmentIntervalMin}
          />
        </FormField>
        <FormField
          label="Meta de faturamento mensal"
          name="monthlyRevenueGoal"
          hint="Usada na barra de progresso do painel."
        >
          <Input
            id="monthlyRevenueGoal"
            name="monthlyRevenueGoal"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial.monthlyRevenueGoal ?? ''}
          />
        </FormField>
        <FormField
          label="Cancelamento até (horas antes)"
          name="cancellationPolicyHours"
        >
          <Input
            id="cancellationPolicyHours"
            name="cancellationPolicyHours"
            type="number"
            min={0}
            max={168}
            defaultValue={initial.cancellationPolicyHours}
          />
        </FormField>
      </div>

      <FormField label="Política de cancelamento" name="cancellationPolicyText">
        <Textarea
          id="cancellationPolicyText"
          name="cancellationPolicyText"
          defaultValue={initial.cancellationPolicyText}
          placeholder="Ex.: cancelamentos com menos de 24h de antecedência podem gerar cobrança."
        />
      </FormField>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Lembretes automáticos</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="reminder24hEnabled"
            defaultChecked={initial.reminder24hEnabled}
          />
          Enviar lembrete 24 horas antes
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="reminder2hEnabled"
            defaultChecked={initial.reminder2hEnabled}
          />
          Enviar lembrete 2 horas antes
        </label>
        <p className="text-xs text-[var(--muted-foreground)]">
          O envio pelo WhatsApp é ativado na fase 4; a preferência já fica salva.
        </p>
      </fieldset>

      <SubmitButton>Salvar alterações</SubmitButton>
    </form>
  )
}
