import type { Metadata } from 'next'
import { Package } from 'lucide-react'
import { requirePermission } from '@/lib/auth/context'
import { ModulePreview } from '@/components/layout/module-preview'

export const metadata: Metadata = { title: 'Produtos' }

export default async function ProdutosPage() {
  await requirePermission('products.view')

  return (
    <ModulePreview
      title="Produtos"
      description="Cadastro de produtos, marcas, fornecedores e preços."
      phase="Fase 3"
      icon={Package}
      ready={[
        'Tabela `products` com SKU, código de barras, custo, preço e estoque mínimo',
        'Tabelas `product_categories` e `suppliers`',
        'Vínculo com insumos de serviços',
      ]}
      planned={[
        'Cadastro com categorias, fornecedor e margem',
        'Importação de catálogo',
        'Alerta de produtos abaixo do estoque mínimo',
      ]}
    />
  )
}
