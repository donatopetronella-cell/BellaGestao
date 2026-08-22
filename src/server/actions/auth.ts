'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  authenticate,
  createSession,
  registerAccount,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  verifyEmail,
} from '@/lib/auth/service'
import {
  clearSessionCookie,
  readSessionCookie,
  setActiveTenantCookie,
  setSessionCookie,
} from '@/lib/auth/cookies'
import { getAuthContext } from '@/lib/auth/context'
import { requestMeta, writeAudit } from '@/lib/audit'
import { getAdminDb } from '@/lib/db'
import { presentError } from '@/lib/errors'
import { rateLimit } from '@/lib/rate-limit'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/validators/auth'
import type { FormState } from './types'

function fail(error: unknown): FormState {
  const presented = presentError(error)
  return {
    status: 'error',
    message: presented.message,
    fieldErrors: presented.details,
  }
}

function fromZod(error: z.ZodError): FormState {
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

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    salonName: formData.get('salonName'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    password: formData.get('password'),
    planCode: formData.get('planCode') ?? 'profissional',
    acceptTerms: formData.get('acceptTerms') === 'on',
  })
  if (!parsed.success) return fromZod(parsed.error)

  const meta = await requestMeta()
  const limit = rateLimit(`register:${meta.ip ?? 'unknown'}`, 5, 60 * 15)
  if (!limit.allowed) {
    return {
      status: 'error',
      message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    }
  }

  try {
    const result = await registerAccount(parsed.data)
    const session = await createSession(result.userId, meta)
    await setSessionCookie(session.token, session.expiresAt)
    await setActiveTenantCookie(result.tenantId)
    await getAdminDb().session.update({
      where: { id: session.id },
      data: { activeTenantId: result.tenantId },
    })
  } catch (error) {
    return fail(error)
  }

  redirect('/onboarding')
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  const meta = await requestMeta()
  const limit = rateLimit(
    `login:${parsed.data.email}:${meta.ip ?? 'unknown'}`,
    10,
    60 * 10,
  )
  if (!limit.allowed) {
    return {
      status: 'error',
      message: `Muitas tentativas. Tente novamente em ${Math.ceil(
        limit.retryAfterSeconds / 60,
      )} minuto(s).`,
    }
  }

  try {
    const { userId } = await authenticate(parsed.data)
    const session = await createSession(userId, meta)
    await setSessionCookie(session.token, session.expiresAt)
  } catch (error) {
    return fail(error)
  }

  redirect('/painel')
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionCookie()
  if (token) await revokeSession(token)
  await clearSessionCookie()
  redirect('/entrar')
}

export async function switchTenantAction(formData: FormData): Promise<void> {
  const tenantId = z.string().uuid().safeParse(formData.get('tenantId'))
  if (!tenantId.success) return

  const context = await getAuthContext()
  if (!context) redirect('/entrar')

  const allowed = context.memberships.some(
    (membership) => membership.tenantId === tenantId.data,
  )
  if (!allowed) return

  await setActiveTenantCookie(tenantId.data)
  await getAdminDb().session.update({
    where: { id: context.sessionId },
    data: { activeTenantId: tenantId.data },
  })
  revalidatePath('/', 'layout')
  redirect('/painel')
}

export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return fromZod(parsed.error)

  const meta = await requestMeta()
  const limit = rateLimit(`forgot:${meta.ip ?? 'unknown'}`, 5, 60 * 15)
  if (!limit.allowed) {
    return { status: 'error', message: 'Muitas tentativas. Aguarde alguns minutos.' }
  }

  try {
    const result = await requestPasswordReset(parsed.data.email)
    if (result && process.env.NODE_ENV !== 'production') {
      // Delivery lands in phase 4 (transactional e-mail provider); until then
      // the link is logged so the flow is usable in development.
      console.warn(
        `[bellagestao] password reset link: /redefinir-senha?token=${result.token}`,
      )
    }
  } catch (error) {
    return fail(error)
  }

  return {
    status: 'success',
    message:
      'Se existir uma conta com este e-mail, enviaremos um link de recuperação.',
  }
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return fromZod(parsed.error)

  try {
    await resetPassword(parsed.data.token, parsed.data.password)
  } catch (error) {
    return fail(error)
  }

  return {
    status: 'success',
    message: 'Senha alterada. Entre com a nova senha.',
  }
}

export async function verifyEmailAction(token: string): Promise<FormState> {
  try {
    await verifyEmail(token)
    const context = await getAuthContext()
    if (context?.tenant) {
      await writeAudit({
        tenantId: context.tenant.id,
        userId: context.user.id,
        userName: context.user.name,
        action: 'user.email_verified',
        entity: 'user',
        entityId: context.user.id,
      })
    }
    return { status: 'success', message: 'E-mail verificado com sucesso.' }
  } catch (error) {
    return fail(error)
  }
}
