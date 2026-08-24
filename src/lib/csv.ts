export interface CsvColumn<T> {
  key: keyof T
  label: string
  format?: (value: T[keyof T], row: T) => string
}

function escapeCsvCell(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Excel-friendly CSV: semicolon separator (pt-BR locale) with a UTF-8 BOM. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(';')
  const lines = rows.map((row) =>
    columns
      .map((column) => {
        const raw = row[column.key]
        const text = column.format ? column.format(raw, row) : String(raw ?? '')
        return escapeCsvCell(text)
      })
      .join(';'),
  )
  return ['﻿' + header, ...lines].join('\r\n')
}

export function csvResponse(filename: string, content: string): Response {
  return new Response(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
