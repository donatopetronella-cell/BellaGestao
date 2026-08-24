'use client'

import { useActionState, useState } from 'react'
import { saveLoyaltyProgramAction } from '@/server/actions/loyalty'
import { idleFormState } from '@/server/actions/types'
import type { LoyaltyProgramData } from '../service'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

export function ProgramForm({ program }: { program: LoyaltyProgramData }) {
  const [state, formAction] = useActionState(saveLoyaltyProgramAction, idleFormState)
  const [mode, setMode] = useState(program.mode)

  return (
    <form action={formAction} className="space-y-4">
      {state.status === 'success' ? <Alert variant="success">{state.message}</Alert> : null}
      {state.status === 'error' && !state.fieldErrors ? (
        <Alert variant="error">{state.message}</Alert>
      ) : null}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={program.isActive} />
        Programa de fidelidade ativo
      </label>

      <FormField label="Modo" name="mode">
        <Select
          id="mode"
          name="mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as typeof mode)}
        >
          <option value="POINTS">Pontos</option>
          <option value="CASHBACK">Cashback</option>
          <option value="VISITS">Número de atendimentos</option>
        </Select>
      </FormField>

      {mode === 'POINTS' ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Pontos por R$ 1" name="pointsPerCurrency">
            <Input
              id="pointsPerCurrency"
              name="pointsPerCurrency"
              type="number"
              min={0}
              step="0.01"
              defaultValue={program.pointsPerCurrency}
            />
          </FormField>
          <FormField label="Valor por ponto (R$)" name="currencyPerPoint">
            <Input
              id="currencyPerPoint"
              name="currencyPerPoint"
              type="number"
              min={0}
              step="0.01"
              defaultValue={program.currencyPerPoint}
            />
          </FormField>
          <FormField label="Mínimo para resgate" name="minRedeemPoints">
            <Input
              id="minRedeemPoints"
              name="minRedeemPoints"
              type="number"
              min={0}
              defaultValue={program.minRedeemPoints}
            />
          </FormField>
        </div>
      ) : null}

      {mode === 'CASHBACK' ? (
        <FormField label="Cashback (%)" name="cashbackPercent" className="max-w-xs">
          <Input
            id="cashbackPercent"
            name="cashbackPercent"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={program.cashbackPercent}
          />
        </FormField>
      ) : null}

      {mode === 'VISITS' ? (
        <FormField label="Atendimentos para recompensa" name="visitsForReward" className="max-w-xs">
          <Input
            id="visitsForReward"
            name="visitsForReward"
            type="number"
            min={1}
            defaultValue={program.visitsForReward}
          />
        </FormField>
      ) : null}

      <FormField label="Descrição da recompensa" name="rewardDescription">
        <Input
          id="rewardDescription"
          name="rewardDescription"
          defaultValue={program.rewardDescription ?? ''}
          placeholder="Ex.: 500 pontos = R$ 30 de desconto"
        />
      </FormField>

      <SubmitButton>Salvar programa</SubmitButton>
    </form>
  )
}
