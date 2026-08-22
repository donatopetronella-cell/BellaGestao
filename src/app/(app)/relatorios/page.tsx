import type { Metadata } from 'next'
import { BarChart3 } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Relatórios' }

export default async function RelatoriosPage() {
  await requirePermission('reports.view')

  return (
    <ModulePreview
      title="Relatórios"
      description="Faturamento, clientes, serviços e profissionais."
      phase="Fase 3"
      icon={BarChart3}
      ready={[
        'Dados consolidados de atendimentos, vendas, despesas e comissões',
        'Índices por período para consultas rápidas',
      ]}
      planned={[
        'Relatórios de faturamento, ticket médio e lucro',
        'Faturamento por profissional, serviço e cliente',
        'Exportação em PDF, Excel e CSV',
      ]}
    />
  )
}
