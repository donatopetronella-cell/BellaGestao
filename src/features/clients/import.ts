import { clientImportRowSchema } from '@/validators/client'

/**
 * CSV import for the client base. Parsing lives here so the browser can show a
 * preview and the server can re-validate the very same way — the preview is a
 * convenience, the server check is the authority.
 */
export interface ParsedClientRow {
  line: number
  name: string
  phone?: string
  email?: string
  birthDate?: string
}

export interface ImportIssue {
  line: number
  message: string
}

export interface ParsedImport {
  rows: ParsedClientRow[]
  issues: ImportIssue[]
  detectedColumns: string[]
}

const HEADER_ALIASES: Record<string, keyof ParsedClientRow> = {
  nome: 'name',
  name: 'name',
  cliente: 'name',
  telefone: 'phone',
  celular: 'phone',
  whatsapp: 'phone',
  fone: 'phone',
  phone: 'phone',
  email: 'email',
  'e-mail': 'email',
  aniversario: 'birthDate',
  aniversário: 'birthDate',
  nascimento: 'birthDate',
  'data de nascimento': 'birthDate',
  birthdate: 'birthDate',
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function detectDelimiter(headerLine: string): string {
  const candidates = [';', ',', '\t']
  let best = ','
  let bestCount = 0
  for (const candidate of candidates) {
    const count = headerLine.split(candidate).length - 1
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/** RFC-4180-ish splitter: handles quoted fields and escaped quotes. */
function splitLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === delimiter) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

/** `25/08/1990`, `1990-08-25` and `25-08-1990` all become `1990-08-25`. */
export function normalizeImportedDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (iso) return trimmed

  const brazilian = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed)
  if (brazilian) {
    const [, day, month, rawYear] = brazilian
    const year = Number(rawYear!.length === 2 ? `19${rawYear}` : rawYear)
    const monthNum = Number(month)
    const dayNum = Number(day)
    if (!isRealCalendarDate(year, monthNum, dayNum)) return null
    return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
  }

  return null
}

/** `Date` rolls 31/02 over into March, so day/month are checked by hand. */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export const MAX_IMPORT_ROWS = 2000

export function parseClientsCsv(content: string): ParsedImport {
  const clean = content.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n').trim()
  if (!clean) {
    return { rows: [], issues: [{ line: 0, message: 'Arquivo vazio.' }], detectedColumns: [] }
  }

  const lines = clean.split('\n').filter((line) => line.trim().length > 0)
  const headerLine = lines[0] ?? ''
  const delimiter = detectDelimiter(headerLine)
  const headers = splitLine(headerLine, delimiter).map((header) =>
    stripAccents(header.toLowerCase().trim()),
  )

  const mapping = headers.map((header) => HEADER_ALIASES[header] ?? null)
  const detectedColumns = mapping.filter((field): field is keyof ParsedClientRow =>
    field !== null,
  )

  if (!detectedColumns.includes('name')) {
    return {
      rows: [],
      issues: [
        {
          line: 1,
          message:
            'Não encontramos a coluna "nome". O arquivo deve ter um cabeçalho com nome, telefone, e-mail e aniversário.',
        },
      ],
      detectedColumns: [],
    }
  }

  const rows: ParsedClientRow[] = []
  const issues: ImportIssue[] = []
  const seenPhones = new Set<string>()

  for (let index = 1; index < lines.length; index += 1) {
    const line = index + 1
    if (rows.length >= MAX_IMPORT_ROWS) {
      issues.push({
        line,
        message: `Importação limitada a ${MAX_IMPORT_ROWS} linhas por arquivo.`,
      })
      break
    }

    const values = splitLine(lines[index] ?? '', delimiter)
    const record: Record<string, string> = {}
    mapping.forEach((field, column) => {
      if (field) record[field] = values[column] ?? ''
    })

    const birthDate = record.birthDate ? normalizeImportedDate(record.birthDate) : null
    if (record.birthDate && !birthDate) {
      issues.push({ line, message: `Data de nascimento inválida: "${record.birthDate}".` })
      continue
    }

    const parsed = clientImportRowSchema.safeParse({
      name: record.name ?? '',
      phone: record.phone ?? '',
      email: record.email ?? '',
      birthDate: birthDate ?? '',
    })

    if (!parsed.success) {
      issues.push({
        line,
        message: parsed.error.issues[0]?.message ?? 'Linha inválida.',
      })
      continue
    }

    const phoneDigits = (parsed.data.phone ?? '').replace(/\D/g, '')
    if (phoneDigits && seenPhones.has(phoneDigits)) {
      issues.push({
        line,
        message: `Telefone repetido no arquivo: ${parsed.data.phone}.`,
      })
      continue
    }
    if (phoneDigits) seenPhones.add(phoneDigits)

    rows.push({
      line,
      name: parsed.data.name,
      phone: parsed.data.phone || undefined,
      email: parsed.data.email,
      birthDate: birthDate ?? undefined,
    })
  }

  return { rows, issues, detectedColumns }
}
