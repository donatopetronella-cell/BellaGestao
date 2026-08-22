/**
 * Application errors carry a stable code plus a message that is safe to show
 * to an end user. Anything else is logged and surfaced as a generic message —
 * users never see `SQLSTATE 23505`.
 */
export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'PLAN_LIMIT'
  | 'INTERNAL'

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  PLAN_LIMIT: 402,
  INTERNAL: 500,
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details?: Record<string, string[]>

  constructor(
    code: AppErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.details = details
  }
}

export const unauthenticated = (message = 'Sessão expirada. Entre novamente.') =>
  new AppError('UNAUTHENTICATED', message)

export const forbidden = (message = 'Você não tem permissão para esta ação.') =>
  new AppError('FORBIDDEN', message)

export const notFound = (message = 'Registro não encontrado.') =>
  new AppError('NOT_FOUND', message)

export const conflict = (message: string) => new AppError('CONFLICT', message)

export const validationError = (
  message: string,
  details?: Record<string, string[]>,
) => new AppError('VALIDATION', message, details)

const GENERIC_MESSAGE =
  'Não foi possível concluir a operação. Tente novamente em instantes.'

/** Known Postgres/Prisma failures translated into human language. */
function translateDatabaseError(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code
  switch (code) {
    case 'P2002':
    case '23505':
      return 'Já existe um registro com estes dados.'
    case 'P2003':
    case '23503':
      return 'Este registro está vinculado a outros dados e não pode ser alterado.'
    case 'P2025':
      return 'Registro não encontrado.'
    case '42501':
      return 'Você não tem permissão para acessar estes dados.'
    default:
      return null
  }
}

export interface ErrorPresentation {
  code: AppErrorCode
  message: string
  details?: Record<string, string[]>
}

/** Converts any thrown value into something safe to render. */
export function presentError(error: unknown): ErrorPresentation {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details }
  }

  const translated = translateDatabaseError(error)
  if (translated) return { code: 'CONFLICT', message: translated }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[bellagestao] unhandled error', error)
  }
  return { code: 'INTERNAL', message: GENERIC_MESSAGE }
}
