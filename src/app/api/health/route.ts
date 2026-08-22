import { NextResponse } from 'next/server'
import { withContext } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Liveness/readiness probe: process is up and the database answers. */
export async function GET() {
  try {
    await withContext({}, (tx) => tx.$queryRaw`SELECT 1`)
    return NextResponse.json({ status: 'ok', database: 'up' })
  } catch {
    return NextResponse.json(
      { status: 'degraded', database: 'down' },
      { status: 503 },
    )
  }
}
