import type { Metadata } from 'next'
import { ShoppingBag } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Vendas' }

export default async function VendasPage() {
  await requirePermission('sales.view')

  return (
    <ModulePreview
      title="Vendas"
      description="PDV simples para produtos e serviços avulsos."
      phase="Fase 3"
      icon={ShoppingBag}
      ready={[
        'Tabelas `sales`, `sale_items` e `sale_payments`',
        'Numeração sequencial por salão',
        'Vínculo opcional com cliente, profissional e atendimento',
      ]}
      planned={[
        'PDV com busca de produto e leitura de código de barras',
        'Formas de pagamento combinadas e parcelamento',
        'Comissão de venda de produto por profissional',
      ]}
    />
  )
}
