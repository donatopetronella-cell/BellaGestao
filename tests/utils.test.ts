import { describe, expect, it } from 'vitest'
import { formatCurrency, formatPercent, initials, normalizePhone, slugify } from '@/lib/utils'
import {
  resolveRange,
  startOfDayInTimeZone,
  startOfMonthInTimeZone,
  isDashboardRange,
} from '@/lib/dates'
import { presentError, AppError, conflict } from '@/lib/errors'
import { rateLimit, resetRateLimits } from '@/lib/rate-limit'

describe('utils', () => {
  it('formata moeda em pt-BR', () => {
    expect(formatCurrency(3480).replace(/ /g, ' ')).toBe('R$ 3.480,00')
  })

  it('formata percentual', () => {
    expect(formatPercent(83.7)).toBe('83,7%')
  })

  it('gera slug sem acentos para a página pública do salão', () => {
    expect(slugify('Salão Glamour & Beleza')).toBe('salao-glamour-beleza')
  })

  it('extrai iniciais do nome', () => {
    expect(initials('Mariana Alves')).toBe('MA')
    expect(initials('Ana')).toBe('A')
  })

  it('normaliza telefone para o formato do WhatsApp', () => {
    expect(normalizePhone('(11) 99999-0000')).toBe('11999990000')
  })
})

describe('datas com fuso do salão', () => {
  const timeZone = 'America/Sao_Paulo'

  it('início do dia respeita o fuso do salão', () => {
    const start = startOfDayInTimeZone(new Date('2026-08-22T15:30:00Z'), timeZone)
    expect(start.toISOString()).toBe('2026-08-22T03:00:00.000Z')
  })

  it('início do mês respeita o fuso do salão', () => {
    const start = startOfMonthInTimeZone(new Date('2026-08-22T15:30:00Z'), timeZone)
    expect(start.toISOString()).toBe('2026-08-01T03:00:00.000Z')
  })

  it('resolve os períodos do dashboard', () => {
    const now = new Date('2026-08-22T15:30:00Z')
    expect(resolveRange('today', timeZone, now).from.toISOString()).toBe(
      '2026-08-22T03:00:00.000Z',
    )
    expect(resolveRange('7d', timeZone, now).from.toISOString()).toBe(
      '2026-08-16T03:00:00.000Z',
    )
    expect(resolveRange('month', timeZone, now).from.toISOString()).toBe(
      '2026-08-01T03:00:00.000Z',
    )
  })

  it('valida o parâmetro de período', () => {
    expect(isDashboardRange('30d')).toBe(true)
    expect(isDashboardRange('sempre')).toBe(false)
  })
})

describe('tratamento de erros', () => {
  it('erros de aplicação preservam código e mensagem', () => {
    const presented = presentError(conflict('Este cliente já está cadastrado.'))
    expect(presented.code).toBe('CONFLICT')
    expect(presented.message).toBe('Este cliente já está cadastrado.')
  })

  it('violação de unicidade vira mensagem em português', () => {
    const presented = presentError(Object.assign(new Error('duplicate'), { code: '23505' }))
    expect(presented.message).toBe('Já existe um registro com estes dados.')
  })

  it('erro desconhecido nunca vaza detalhes técnicos', () => {
    const presented = presentError(new Error('SQLSTATE 23505: duplicate key value'))
    expect(presented.code).toBe('INTERNAL')
    expect(presented.message).not.toContain('SQLSTATE')
  })

  it('AppError carrega o status HTTP correspondente', () => {
    expect(new AppError('FORBIDDEN', 'x').status).toBe(403)
    expect(new AppError('VALIDATION', 'x').status).toBe(422)
  })
})

describe('rate limit', () => {
  it('bloqueia após exceder o limite na janela', () => {
    resetRateLimits()
    const key = 'login:teste'
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(rateLimit(key, 3, 60).allowed).toBe(true)
    }
    const blocked = rateLimit(key, 3, 60)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
})
