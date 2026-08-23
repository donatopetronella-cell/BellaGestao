import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/context'
import { getClientPhotoPath } from '@/features/clients/service'
import { getStorage } from '@/lib/storage'
import { uuidSchema } from '@/validators/common'

export const dynamic = 'force-dynamic'

/**
 * Client photos are personal data: served only to a signed-in member of the
 * salon that owns them (the lookup itself is tenant-scoped by RLS).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext()
  if (!context?.tenant) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }
  if (!context.permissions.has('clients.hair_record.view')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { id } = await params
  const photoId = uuidSchema.safeParse(id)
  if (!photoId.success) {
    return NextResponse.json({ error: 'Foto inválida.' }, { status: 400 })
  }

  const storagePath = await getClientPhotoPath(context.tenant.id, photoId.data)
  if (!storagePath) {
    return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })
  }

  const object = await getStorage().get(storagePath)
  if (!object) {
    return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })
  }

  return new NextResponse(Buffer.from(object.bytes), {
    headers: {
      'Content-Type': object.contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    },
  })
}
