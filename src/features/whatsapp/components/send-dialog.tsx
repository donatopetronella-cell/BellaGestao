'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { sendWhatsappMessageAction } from '@/server/actions/whatsapp'
import type { WhatsappTemplateItem } from '../service'
import { ClientPicker, type PickedClient } from '@/features/appointments/components/client-picker'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'

export function SendDialog({ templates }: { templates: WhatsappTemplateItem[] }) {
  const [client, setClient] = useState<PickedClient | null>(null)
  const active = templates.filter((template) => template.isActive)

  return (
    <FormDialog
      trigger={
        <Button variant="outline">
          <Send className="size-4" /> Enviar mensagem
        </Button>
      }
      title="Enviar mensagem"
      description="Escolha a cliente e o modelo. A mensagem sai na hora."
      action={sendWhatsappMessageAction}
      submitLabel="Enviar"
      onSuccess={() => setClient(null)}
    >
      {(state) => (
        <>
          <ClientPicker value={client} onChange={setClient} error={state.fieldErrors?.clientId} />

          <FormField label="Modelo" name="templateId" error={state.fieldErrors?.templateId}>
            <Select id="templateId" name="templateId" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {active.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
