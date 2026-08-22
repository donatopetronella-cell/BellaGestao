import type { Metadata } from 'next'
import { Scissors } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Serviços' }

export default async function ServicosPage() {
  await requirePermission('services.view')

  return (
    <ModulePreview
      title="Serviços"
      description="Catálogo, duração, preços, comissão e insumos."
      phase="Fase 2"
      icon={Scissors}
      ready={[
        'Tabela `services` com duração, preço, custo e regra de comissão',
        'Tabela `service_categories`',
        'Tabela `service_professionals` com preço e duração por profissional',
        'Tabela `service_supplies` ligando serviços a insumos do estoque',
      ]}
      planned={[
        'Cadastro por categoria com ativação e desativação',
        'Preço diferente por profissional',
        'Vínculo de insumos para baixa automática de estoque',
        'Regras de comissão por serviço',
      ]}
    />
  )
}
