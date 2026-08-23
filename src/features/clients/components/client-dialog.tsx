'use client'

import { Plus } from 'lucide-react'
import { createClientAction, updateClientAction } from '@/server/actions/clients'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export interface ClientFormValues {
  id: string
  name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  document: string | null
  birthDate: Date | null
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  notes: string | null
  preferences: string | null
  allergies: string | null
  source: string | null
  preferredProfessionalId: string | null
  marketingConsent: boolean
}

const ORIGINS = [
  'Indicação',
  'Instagram',
  'Google',
  'Passou em frente',
  'WhatsApp',
  'Facebook',
  'Outro',
]

function dateValue(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : ''
}

export function ClientDialog({
  client,
  professionals,
  trigger,
}: {
  client?: ClientFormValues
  professionals: Array<{ id: string; name: string }>
  trigger?: React.ReactNode
}) {
  const editing = client !== undefined

  return (
    <FormDialog
      trigger={
        trigger ?? (
          <Button>
            <Plus className="size-4" /> Nova cliente
          </Button>
        )
      }
      title={editing ? 'Editar cliente' : 'Nova cliente'}
      description="Telefone e aniversário alimentam lembretes e campanhas."
      action={editing ? updateClientAction : createClientAction}
      submitLabel={editing ? 'Salvar alterações' : 'Cadastrar'}
      className="max-h-[90dvh] max-w-2xl overflow-y-auto"
    >
      {(state) => (
        <>
          {editing ? <input type="hidden" name="clientId" value={client.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nome"
              name="name"
              error={state.fieldErrors?.name}
              className="sm:col-span-2"
            >
              <Input id="name" name="name" defaultValue={client?.name} required />
            </FormField>

            <FormField label="Telefone" name="phone" error={state.fieldErrors?.phone}>
              <Input
                id="phone"
                name="phone"
                defaultValue={client?.phone ?? ''}
                placeholder="(11) 99999-0000"
              />
            </FormField>

            <FormField
              label="WhatsApp"
              name="whatsapp"
              hint="Se vazio, usamos o telefone."
              error={state.fieldErrors?.whatsapp}
            >
              <Input id="whatsapp" name="whatsapp" defaultValue={client?.whatsapp ?? ''} />
            </FormField>

            <FormField label="E-mail" name="email" error={state.fieldErrors?.email}>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client?.email ?? ''}
              />
            </FormField>

            <FormField label="Aniversário" name="birthDate">
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={dateValue(client?.birthDate ?? null)}
              />
            </FormField>

            <FormField label="CPF" name="document">
              <Input id="document" name="document" defaultValue={client?.document ?? ''} />
            </FormField>

            <FormField label="Profissional preferido" name="preferredProfessionalId">
              <Select
                id="preferredProfessionalId"
                name="preferredProfessionalId"
                defaultValue={client?.preferredProfessionalId ?? ''}
              >
                <option value="">Sem preferência</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Como conheceu o salão" name="source">
              <Select id="source" name="source" defaultValue={client?.source ?? ''}>
                <option value="">Não informado</option>
                {ORIGINS.map((origin) => (
                  <option key={origin} value={origin}>
                    {origin}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <details className="rounded-lg border border-[var(--border)] p-3">
            <summary className="cursor-pointer text-sm font-medium">Endereço</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FormField label="CEP" name="zipCode">
                <Input id="zipCode" name="zipCode" defaultValue={client?.zipCode ?? ''} />
              </FormField>
              <FormField label="Rua" name="street">
                <Input id="street" name="street" defaultValue={client?.street ?? ''} />
              </FormField>
              <FormField label="Número" name="number">
                <Input id="number" name="number" defaultValue={client?.number ?? ''} />
              </FormField>
              <FormField label="Complemento" name="complement">
                <Input
                  id="complement"
                  name="complement"
                  defaultValue={client?.complement ?? ''}
                />
              </FormField>
              <FormField label="Bairro" name="district">
                <Input id="district" name="district" defaultValue={client?.district ?? ''} />
              </FormField>
              <FormField label="Cidade" name="city">
                <Input id="city" name="city" defaultValue={client?.city ?? ''} />
              </FormField>
              <FormField label="UF" name="state">
                <Input
                  id="state"
                  name="state"
                  maxLength={2}
                  defaultValue={client?.state ?? ''}
                />
              </FormField>
            </div>
          </details>

          <FormField label="Preferências" name="preferences">
            <Textarea
              id="preferences"
              name="preferences"
              defaultValue={client?.preferences ?? ''}
              placeholder="Ex.: prefere café sem açúcar, não gosta de secador muito quente."
            />
          </FormField>

          <FormField label="Alergias e restrições" name="allergies">
            <Textarea
              id="allergies"
              name="allergies"
              defaultValue={client?.allergies ?? ''}
              placeholder="Ex.: alergia a amônia."
            />
          </FormField>

          <FormField label="Observações" name="notes">
            <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ''} />
          </FormField>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="marketingConsent"
              className="mt-0.5"
              defaultChecked={client?.marketingConsent ?? true}
            />
            <span>
              Autoriza receber mensagens de lembrete e campanhas pelo WhatsApp
              <span className="block text-xs text-[var(--muted-foreground)]">
                Consentimento registrado conforme a LGPD.
              </span>
            </span>
          </label>
        </>
      )}
    </FormDialog>
  )
}
