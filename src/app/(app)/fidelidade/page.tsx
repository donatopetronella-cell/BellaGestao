import type { Metadata } from 'next'
import { Gift } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Fidelidade' }

export default async function FidelidadePage() {
  await requirePermission('loyalty.view')

  return (
    <ModulePreview
      title="Fidelidade"
      description="Pontos, cashback e recompensas."
      phase="Fase 4"
      icon={Gift}
      ready={[
        'Tabelas `loyalty_programs`, `loyalty_accounts` e `loyalty_transactions`',
        'Modos de pontos, cashback ou número de atendimentos',
        'Saldo e extrato por cliente',
      ]}
      planned={[
        'Configuração do programa e das recompensas',
        'Acúmulo automático a cada atendimento pago',
        'Resgate no caixa e no PDV',
      ]}
    />
  )
}
