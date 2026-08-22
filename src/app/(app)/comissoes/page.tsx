import type { Metadata } from 'next'
import { Percent } from 'lucide-react'
import { requireAnyPermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Comissões' }

export default async function ComissoesPage() {
  await requireAnyPermission(['commissions.view', 'commissions.view_own'])

  return (
    <ModulePreview
      title="Comissões"
      description="Regras, cálculo automático e fechamento mensal."
      phase="Fase 3"
      icon={Percent}
      ready={[
        'Tabela `commission_rules` (percentual ou valor fixo, por serviço, produto ou profissional)',
        'Tabela `commissions` com base de cálculo, valor e status',
        'Referência mensal para fechamento',
      ]}
      planned={[
        'Cálculo automático ao finalizar atendimento ou venda',
        'Fechamento mensal por profissional',
        'Aprovação e baixa de pagamento das comissões',
      ]}
    />
  )
}
