import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { listExpenses, listRevenues } from '@/features/finance/service'
import { csvResponse, toCsv } from '@/lib/csv'
import { formatDate } from '@/lib/utils'

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
  const [revenues, expenses] = await Promise.all([
    listRevenues(context.tenant.id, { month }),
    listExpenses(context.tenant.id, { month }),
  ])

  const rows = [
    ...revenues.map((row) => ({
      tipo: 'Receita',
      descricao: row.description,
      categoria: row.categoryName ?? '',
      valor: row.amount,
      status: row.status,
      data: row.receivedAt ?? row.createdAt,
    })),
    ...expenses.map((row) => ({
      tipo: 'Despesa',
      descricao: row.description,
      categoria: row.categoryName ?? '',
      valor: row.amount,
      status: row.status,
      data: row.paidAt ?? row.createdAt,
    })),
  ]

  const csv = toCsv(rows, [
    { key: 'tipo', label: 'Tipo' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'valor', label: 'Valor', format: (value) => (value as number).toFixed(2) },
    { key: 'status', label: 'Status' },
    { key: 'data', label: 'Data', format: (value) => formatDate(value as Date) },
  ])

  return csvResponse(`financeiro-${month}.csv`, csv)
}
