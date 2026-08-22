import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string, currency = 'BRL'): string {
  const numeric = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(Number.isFinite(numeric) ? numeric : 0)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`
}

export function formatDate(value: Date | string, timeZone = 'America/Sao_Paulo'): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone }).format(date)
}

export function formatTime(value: Date | string, timeZone = 'America/Sao_Paulo'): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

/** URL-safe slug used for tenant public pages (bellagestao.com/<slug>). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Digits-only phone, ready for the WhatsApp Cloud API. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}
