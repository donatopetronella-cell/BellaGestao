import type { Metadata } from 'next'
import { Megaphone } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Marketing' }

export default async function MarketingPage() {
  await requirePermission('marketing.view')

  return (
    <ModulePreview
      title="Marketing"
      description="Campanhas, recuperação de clientes e aniversariantes."
      phase="Fase 4"
      icon={Megaphone}
      ready={[
        'Tabelas `campaigns` e `campaign_targets`',
        'Filtros de segmentação salvos em JSON',
        'Base de clientes com data de última visita e aniversário',
      ]}
      planned={[
        'Campanhas de reativação por faixa de inatividade (30/60/90/120 dias)',
        'Envio automático de felicitações de aniversário',
        'Métricas de retorno por campanha',
      ]}
    />
  )
}
