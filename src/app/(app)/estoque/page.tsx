import type { Metadata } from 'next'
import { Boxes } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Estoque' }

export default async function EstoquePage() {
  await requirePermission('inventory.view')

  return (
    <ModulePreview
      title="Estoque"
      description="Saldo por unidade, movimentações e baixa automática."
      phase="Fase 3"
      icon={Boxes}
      ready={[
        'Tabela `inventory` com saldo por unidade e produto',
        'Tabela `inventory_movements` com tipo, quantidade, custo e referência',
        'Estrutura pronta para baixa automática ao finalizar atendimento',
      ]}
      planned={[
        'Entradas, saídas, perdas e ajustes',
        'Baixa automática de insumos ao finalizar o atendimento',
        'Alertas de estoque mínimo e sugestão de compra',
      ]}
    />
  )
}
