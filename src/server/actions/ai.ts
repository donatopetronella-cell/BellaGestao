'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { askBellaIa } from '@/features/ai/service'
import { askBellaIaSchema } from '@/validators/ai'
import type { FormState } from './types'
import { fail, fromZod, ok, text } from './form'

export async function askBellaIaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePermission('ai.use')
  const parsed = askBellaIaSchema.safeParse({ question: text(formData, 'question') })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    const result = await askBellaIa(
      context.tenant.id,
      context.user.id,
      parsed.data.question,
      context.tenant.timezone,
    )
    revalidatePath('/bella-ia')
    return ok(result.answer)
  } catch (error) {
    return fail(error)
  }
}
