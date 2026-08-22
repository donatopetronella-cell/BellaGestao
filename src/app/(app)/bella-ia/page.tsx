import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Bella IA' }

export default async function BellaIaPage() {
  await requirePermission('ai.use')

  return (
    <ModulePreview
      title="Bella IA"
      description="Perguntas sobre o seu salão e insights automáticos."
      phase="Fase 5"
      icon={Sparkles}
      ready={[
        'Consultas sempre restritas ao salão ativo pelas políticas de RLS',
        'Base consolidada de faturamento, clientes, serviços e estoque',
      ]}
      planned={[
        'Perguntas em linguagem natural sobre os dados do salão',
        'Insights proativos (clientes inativos, margem por serviço, previsão de demanda)',
        'Resumo mensal automático do desempenho',
      ]}
    />
  )
}
