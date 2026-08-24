import 'server-only'
import { getDashboardData } from '@/features/dashboard/queries'
import { listClients } from '@/features/clients/service'
import { listProducts } from '@/features/products/service'

export interface BellaInsights {
  revenueMonth: number
  forecastMonth: number
  goalProgress: number | null
  inactiveClients: number
  returnRate: number
  topServices: Array<{ name: string; quantity: number; revenue: number }>
  lowStockProducts: Array<{ name: string; stock: number; minStock: number; unit: string }>
  bestProfessional: { name: string; revenue: number } | null
}

/** Deterministic numbers — no LLM involved. This is what grounds Bella IA's
 * answers and what the insight cards show even without an OpenAI key. */
export async function getBellaInsights(
  tenantId: string,
  timeZone: string,
): Promise<BellaInsights> {
  const [dashboard, inactive, lowStock] = await Promise.all([
    getDashboardData(tenantId, { range: 'month', timeZone }),
    listClients(tenantId, { filter: 'inativos', perPage: 1 }),
    listProducts(tenantId, { lowStockOnly: true, perPage: 100 }),
  ])

  const bestProfessional = [...dashboard.professionals].sort(
    (a, b) => b.revenue - a.revenue,
  )[0]

  return {
    revenueMonth: dashboard.finance.revenueMonth,
    forecastMonth: dashboard.finance.forecastMonth,
    goalProgress: dashboard.finance.goalProgress,
    inactiveClients: inactive.total,
    returnRate: dashboard.clients.returnRate,
    topServices: dashboard.topServices.slice(0, 5),
    lowStockProducts: lowStock.items.slice(0, 5).map((product) => ({
      name: product.name,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
    })),
    bestProfessional: bestProfessional
      ? { name: bestProfessional.name, revenue: bestProfessional.revenue }
      : null,
  }
}

/** Compact text summary handed to the LLM as grounding context — the model
 * is instructed to answer only from this, nothing invented. */
export function describeInsights(insights: BellaInsights): string {
  const lines = [
    `Faturamento do mês: R$ ${insights.revenueMonth.toFixed(2)} (projeção: R$ ${insights.forecastMonth.toFixed(2)}).`,
    insights.goalProgress !== null
      ? `Meta mensal atingida: ${insights.goalProgress.toFixed(0)}%.`
      : 'Nenhuma meta mensal configurada.',
    `Clientes inativas (90+ dias sem retornar): ${insights.inactiveClients}.`,
    `Taxa de retorno de clientes: ${insights.returnRate.toFixed(0)}%.`,
    insights.bestProfessional
      ? `Profissional com maior faturamento no mês: ${insights.bestProfessional.name} (R$ ${insights.bestProfessional.revenue.toFixed(2)}).`
      : 'Sem dados de profissionais no período.',
    insights.topServices.length > 0
      ? `Serviços mais vendidos no mês: ${insights.topServices
          .map((service) => `${service.name} (${service.quantity}x, R$ ${service.revenue.toFixed(2)})`)
          .join('; ')}.`
      : 'Nenhum serviço vendido no período.',
    insights.lowStockProducts.length > 0
      ? `Produtos com estoque baixo: ${insights.lowStockProducts
          .map((product) => `${product.name} (${product.stock}/${product.minStock} ${product.unit})`)
          .join('; ')}.`
      : 'Nenhum produto com estoque abaixo do mínimo.',
  ]
  return lines.join('\n')
}
