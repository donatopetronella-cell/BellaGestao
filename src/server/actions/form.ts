import type { z } from 'zod'
import { presentError } from '@/lib/errors'
import type { FormState } from './types'

/** Zod issues → field errors the form components render inline. */
export function fromZod(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return {
    status: 'error',
    message: 'Revise os campos destacados.',
    fieldErrors,
  }
}

/** Any thrown value → a message that is safe to show. */
export function fail(error: unknown): FormState {
  const presented = presentError(error)
  return {
    status: 'error',
    message: presented.message,
    fieldErrors: presented.details,
  }
}

export function ok(message?: string, data?: Record<string, string>): FormState {
  return { status: 'success', message, data }
}

export function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export function optionalText(formData: FormData, name: string): string | undefined {
  const value = text(formData, name)
  return value === '' ? undefined : value
}

export function checkbox(formData: FormData, name: string): boolean {
  const value = formData.get(name)
  return value === 'on' || value === 'true' || value === '1'
}

export function textList(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === 'string' && value !== '')
}

export function numberOrUndefined(
  formData: FormData,
  name: string,
): number | undefined {
  const value = text(formData, name)
  if (value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
