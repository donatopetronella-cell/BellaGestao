'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createCampaignAction, previewCampaignTargetsAction } from '@/server/actions/campaigns'
import type { CampaignInput } from '@/validators/campaign'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export interface TemplateOption {
  id: string
  name: string
}

const TYPE_LABEL: Record<CampaignInput['type'], string> = {
  REACTIVATION: 'Reativação de clientes inativas',
  BIRTHDAY: 'Aniversariantes do mês',
  PROMOTION: 'Promoção',
  REMINDER: 'Lembrete',
  CUSTOM: 'Toda a base',
}

export function CampaignDialog({ templates }: { templates: TemplateOption[] }) {
  const [type, setType] = useState<CampaignInput['type']>('REACTIVATION')
  const [inactiveDays, setInactiveDays] = useState(90)
  const [birthdayMonth, setBirthdayMonth] = useState(new Date().getMonth() + 1)
  const [preview, setPreview] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const count = await previewCampaignTargetsAction(
        type,
        type === 'REACTIVATION' ? inactiveDays : undefined,
        type === 'BIRTHDAY' ? birthdayMonth : undefined,
      )
      setPreview(count)
    })
  }, [type, inactiveDays, birthdayMonth])

  return (
    <FormDialog
      trigger={
        <Button>
          <Plus className="size-4" /> Nova campanha
        </Button>
      }
      title="Nova campanha"
      description="A campanha fica em rascunho até você mandar enviar."
      action={createCampaignAction}
      submitLabel="Criar campanha"
      className="max-w-xl"
    >
      {(state) => (
        <>
          <FormField label="Nome" name="name" error={state.fieldErrors?.name}>
            <Input id="name" name="name" placeholder="Ex.: Reativação de outubro" required />
          </FormField>

          <FormField label="Modelo" name="templateId" error={state.fieldErrors?.templateId}>
            <Select id="templateId" name="templateId" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Público" name="type">
            <Select
              id="type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as CampaignInput['type'])}
            >
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          {type === 'REACTIVATION' ? (
            <FormField label="Dias sem retornar" name="inactiveDays" className="max-w-xs">
              <Input
                id="inactiveDays"
                name="inactiveDays"
                type="number"
                min={0}
                value={inactiveDays}
                onChange={(event) => setInactiveDays(Number(event.target.value) || 0)}
              />
            </FormField>
          ) : null}

          {type === 'BIRTHDAY' ? (
            <FormField label="Mês" name="birthdayMonth" className="max-w-xs">
              <Select
                id="birthdayMonth"
                name="birthdayMonth"
                value={birthdayMonth}
                onChange={(event) => setBirthdayMonth(Number(event.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2024, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}

          <p className="text-sm text-[var(--muted-foreground)]">
            {pending ? 'Calculando público…' : `${preview ?? 0} cliente(s) com consentimento de marketing.`}
          </p>
        </>
      )}
    </FormDialog>
  )
}
