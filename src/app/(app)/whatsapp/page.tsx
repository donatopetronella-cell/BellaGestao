import type { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'WhatsApp' }

export default async function WhatsappPage() {
  await requirePermission('whatsapp.view')

  return (
    <ModulePreview
      title="WhatsApp"
      description="Templates, confirmações e lembretes automáticos."
      phase="Fase 4"
      icon={MessageCircle}
      ready={[
        'Tabelas `whatsapp_templates` e `whatsapp_messages`',
        'Status de entrega, leitura e erro por mensagem',
        'Agendamento de envio (lembretes 24h e 2h)',
      ]}
      planned={[
        'Integração com a WhatsApp Cloud API',
        'Confirmação de agendamento com opções de confirmar, reagendar e cancelar',
        'Central de mensagens com histórico por cliente',
      ]}
    />
  )
}
