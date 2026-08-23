'use client'

import { useActionState } from 'react'
import { saveHairProfileAction } from '@/server/actions/clients'
import { idleFormState } from '@/server/actions/types'
import type { HairProfileInput } from '@/validators/client'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

const HAIR_TYPES = ['Liso', 'Ondulado', 'Cacheado', 'Crespo']
const LENGTHS = ['Curto', 'Médio', 'Longo']
const CURVATURES = ['1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C', '4A', '4B', '4C']
const TEXTURES = ['Fina', 'Média', 'Grossa']
const CONDITIONS = [
  'Saudável',
  'Ressecado',
  'Oleoso',
  'Quimicamente tratado',
  'Danificado',
  'Com queda',
]

export function HairProfileForm({
  clientId,
  profile,
  readOnly,
}: {
  clientId: string
  profile: HairProfileInput | null
  readOnly?: boolean
}) {
  const [state, formAction] = useActionState(saveHairProfileAction, idleFormState)

  if (readOnly) {
    return (
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item label="Tipo de cabelo" value={profile?.hairType} />
        <Item label="Comprimento" value={profile?.length} />
        <Item label="Curvatura" value={profile?.curvature} />
        <Item label="Textura" value={profile?.texture} />
        <Item label="Condição atual" value={profile?.condition} />
        <Item label="Couro cabeludo" value={profile?.scalp} />
        <Item
          label="Procedimentos anteriores"
          value={profile?.previousProcedures}
          full
        />
        <Item label="Alergias" value={profile?.allergies} full />
        <Item label="Observações" value={profile?.notes} full />
      </dl>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />

      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {state.status === 'success' ? (
        <Alert variant="success">{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tipo de cabelo" name="hairType">
          <Select id="hairType" name="hairType" defaultValue={profile?.hairType ?? ''}>
            <option value="">Não informado</option>
            {HAIR_TYPES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Comprimento" name="length">
          <Select id="length" name="length" defaultValue={profile?.length ?? ''}>
            <option value="">Não informado</option>
            {LENGTHS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Curvatura" name="curvature">
          <Select id="curvature" name="curvature" defaultValue={profile?.curvature ?? ''}>
            <option value="">Não informada</option>
            {CURVATURES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Textura" name="texture">
          <Select id="texture" name="texture" defaultValue={profile?.texture ?? ''}>
            <option value="">Não informada</option>
            {TEXTURES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Condição atual" name="condition">
          <Select id="condition" name="condition" defaultValue={profile?.condition ?? ''}>
            <option value="">Não informada</option>
            {CONDITIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Couro cabeludo" name="scalp">
          <Input id="scalp" name="scalp" defaultValue={profile?.scalp ?? ''} />
        </FormField>
      </div>

      <FormField label="Procedimentos anteriores" name="previousProcedures">
        <Textarea
          id="previousProcedures"
          name="previousProcedures"
          defaultValue={profile?.previousProcedures ?? ''}
          placeholder="Ex.: progressiva há 6 meses, coloração mensal."
        />
      </FormField>

      <FormField label="Alergias" name="allergies">
        <Textarea
          id="allergies"
          name="allergies"
          defaultValue={profile?.allergies ?? ''}
        />
      </FormField>

      <FormField label="Observações" name="notes">
        <Textarea id="notes" name="notes" defaultValue={profile?.notes ?? ''} />
      </FormField>

      <SubmitButton>Salvar ficha capilar</SubmitButton>
    </form>
  )
}

function Item({
  label,
  value,
  full,
}: {
  label: string
  value?: string | null
  full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="text-sm">{value?.trim() ? value : '—'}</dd>
    </div>
  )
}
