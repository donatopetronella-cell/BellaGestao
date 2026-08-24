import 'server-only'
import { withTenant } from '@/lib/db'
import { askOpenAi } from '@/lib/openai'
import { describeInsights, getBellaInsights } from '@/features/insights/service'

const SYSTEM_PROMPT = `Você é a Bella IA, assistente do BellaGestão para donas de salão de
beleza. Responda em português, de forma direta e prática, usando SOMENTE os
números fornecidos no contexto abaixo — nunca invente valores. Se a pergunta
não puder ser respondida com esses dados, diga isso claramente e sugira onde
a informação pode estar no sistema.`

export interface AskResult {
  answer: string
  grounded: boolean
}

/**
 * Answers a question about the tenant's own data. Always grounded in the
 * deterministic snapshot (`describeInsights`) — when `OPENAI_API_KEY` isn't
 * configured, the snapshot itself is returned instead of free text, so the
 * feature is useful with zero external dependency.
 */
export async function askBellaIa(
  tenantId: string,
  userId: string | null,
  question: string,
  timeZone: string,
): Promise<AskResult> {
  const insights = await getBellaInsights(tenantId, timeZone)
  const context = describeInsights(insights)

  const llm = await askOpenAi(`${SYSTEM_PROMPT}\n\nDados do salão:\n${context}`, question)

  const result: AskResult = llm
    ? { answer: llm.answer, grounded: true }
    : {
        answer: `Ainda não tenho um modelo de linguagem configurado (defina OPENAI_API_KEY), então aqui vai o retrato atual do seu salão:\n\n${context}`,
        grounded: false,
      }

  await withTenant(tenantId, (tx) =>
    tx.aiQuery.create({
      data: {
        tenantId,
        userId,
        question,
        answer: result.answer,
        grounded: result.grounded,
      },
    }),
  )

  return result
}

export interface AiQueryRow {
  id: string
  question: string
  answer: string
  grounded: boolean
  createdAt: Date
}

export async function listAiQueries(tenantId: string): Promise<AiQueryRow[]> {
  return withTenant(tenantId, (tx) =>
    tx.aiQuery.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, question: true, answer: true, grounded: true, createdAt: true },
    }),
  )
}
