import type { Metadata } from 'next'
import { CreditCard } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Financeiro' }

export default async function FinanceiroPage() {
  await requirePermission('finance.view')

  return (
    <ModulePreview
      title="Financeiro"
      description="Receitas, despesas, fluxo de caixa e relatórios."
      phase="Fase 3"
      icon={CreditCard}
      ready={[
        'Tabelas `revenues`, `expenses` e `financial_categories`',
        'Categorias padrão criadas no cadastro do salão',
        'Status de pagamento, vencimento e recorrência',
      ]}
      planned={[
        'Lançamento de receitas e despesas com anexos',
        'Fluxo de caixa e DRE simplificado',
        'Exportação em PDF, Excel e CSV',
      ]}
    />
  )
}
