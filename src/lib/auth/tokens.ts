import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Opaque, URL-safe secret sent to the user (never stored in clear text). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** Only the digest is persisted, so a database leak cannot replay tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

export function expiresIn(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000)
}

export const TOKEN_TTL = {
  session: 60 * 24 * 30, // 30 days
  passwordReset: 60, // 1 hour
  emailVerification: 60 * 24 * 2, // 48 hours
  invitation: 60 * 24 * 7, // 7 days
} as const
