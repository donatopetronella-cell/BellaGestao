import 'server-only'
import { getEnv } from './env'

/**
 * Bella IA's language model call. Same shape as `whatsapp.ts`/`storage.ts` —
 * a driver interface with one real implementation (OpenAI) that only exists
 * when `OPENAI_API_KEY` is configured. Callers must always be able to work
 * without it: `askOpenAi` returns `null` instead of throwing, so the feature
 * degrades to the deterministic insights snapshot.
 */
export interface OpenAiAnswer {
  answer: string
}

export async function askOpenAi(
  systemPrompt: string,
  question: string,
): Promise<OpenAiAnswer | null> {
  const env = getEnv()
  if (!env.OPENAI_API_KEY) return null

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      }),
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const answer = payload.choices?.[0]?.message?.content?.trim()
    return answer ? { answer } : null
  } catch (error) {
    console.error('[bellagestao] OpenAI request failed', error)
    return null
  }
}
