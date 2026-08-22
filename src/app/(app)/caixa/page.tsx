import type { Metadata } from 'next'
import { Wallet } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Caixa' }

export default async function CaixaPage() {
  await requirePermission('cash.view')

  return (
    <ModulePreview
      title="Caixa"
      description="Abertura, fechamento, sangria e reforço."
      phase="Fase 3"
      icon={Wallet}
      ready={[
        'Tabela `cash_registers` com valores de abertura, fechamento e diferença',
        'Tabela `cash_movements` com sangria, reforço, entradas e saídas',
        'Formas de pagamento padronizadas em enum',
      ]}
      planned={[
        'Abertura e fechamento com conferência de valores',
        'Sangria e reforço com justificativa',
        'Resumo do caixa por forma de pagamento',
      ]}
    />
  )
}
