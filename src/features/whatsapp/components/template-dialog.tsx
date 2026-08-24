'use client'

import { Plus } from 'lucide-react'
import {
  createWhatsappTemplateAction,
  updateWhatsappTemplateAction,
} from '@/server/actions/whatsapp'
import type { WhatsappTemplateItem } from '../service'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function TemplateDialog({
  template,
  trigger,
}: {
  template?: WhatsappTemplateItem
  trigger?: React.ReactNode
}) {
  const editing = template !== undefined

  return (
    <FormDialog
      trigger={
        trigger ?? (
          <Button>
            <Plus className="size-4" /> Novo modelo
          </Button>
        )
      }
      title={editing ? 'Editar modelo' : 'Novo modelo'}
      description="Use {{variavel}} para campos preenchidos automaticamente (cliente, data, hora, servico, profissional, salao)."
      action={editing ? updateWhatsappTemplateAction : createWhatsappTemplateAction}
      submitLabel={editing ? 'Salvar alterações' : 'Criar modelo'}
      className="max-w-xl"
    >
      {(state) => (
        <>
          {editing ? <input type="hidden" name="templateId" value={template.id} /> : null}

          <FormField label="Código" name="code" error={state.fieldErrors?.code} hint="ex.: lembrete_2h">
            <Input id="code" name="code" defaultValue={template?.code} required />
          </FormField>

          <FormField label="Nome" name="name" error={state.fieldErrors?.name}>
            <Input id="name" name="name" defaultValue={template?.name} required />
          </FormField>

          <FormField label="Categoria" name="category">
            <Select id="category" name="category" defaultValue={template?.category ?? 'UTILITY'}>
              <option value="UTILITY">Utilidade</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Autenticação</option>
            </Select>
          </FormField>

          <FormField label="Mensagem" name="body" error={state.fieldErrors?.body}>
            <textarea
              id="body"
              name="body"
              defaultValue={template?.body}
              rows={5}
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={template?.isActive ?? true} />
            Modelo ativo
          </label>
        </>
      )}
    </FormDialog>
  )
}
