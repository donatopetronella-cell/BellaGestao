import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { listSalesForExport } from '@/features/sales/service'
import { csvResponse, toCsv } from '@/lib/csv'
import { formatDate, formatTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const context = await getAuthContext()
  if (!context?.tenant) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }
  if (!context.permissions.has('reports.export')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const month = new URL(request.url).searchParams.get('mes') ?? new Date().toISOString().slice(0, 7)
  const items = await listSalesForExport(context.tenant.id, month)
  const csv = toCsv(items, [
    { key: 'number', label: 'Número' },
    { key: 'soldAt', label: 'Data', format: (value) => `${formatDate(value as Date)} ${formatTime(value as Date)}` },
    { key: 'clientName', label: 'Cliente', format: (value) => (value as string | null) ?? '' },
    { key: 'itemsSummary', label: 'Itens' },
    { key: 'total', label: 'Total', format: (value) => (value as number).toFixed(2) },
    { key: 'status', label: 'Status' },
  ])

  return csvResponse(`vendas-${month}.csv`, csv)
}
