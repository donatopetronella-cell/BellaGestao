import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicSalon, getPublicServices } from '@/features/booking/service'
import { BookingForm } from '@/features/booking/components/booking-form'
import { EmptyState } from '@/components/ui/empty-state'
import { CalendarX } from 'lucide-react'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const salon = await getPublicSalon(slug)
  return { title: salon ? `Agendar em ${salon.name}` : 'Agendar horário' }
}

export const dynamic = 'force-dynamic'

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params
  const salon = await getPublicSalon(slug)
  if (!salon) notFound()

  const services = await getPublicServices(salon.id)

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <header className="mb-8 flex flex-col items-center gap-2 text-center">
          {salon.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salon.logoUrl} alt={salon.name} className="size-14 rounded-full object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-600 text-xl font-semibold text-white">
              {salon.name.charAt(0)}
            </span>
          )}
          <h1 className="text-xl font-semibold">{salon.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Agende seu horário online</p>
        </header>

        {services.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="Nenhum horário disponível online no momento"
            description="Entre em contato diretamente com o salão para agendar."
          />
        ) : (
          <BookingForm tenantId={salon.id} timeZone={salon.timezone} services={services} />
        )}
      </div>
    </div>
  )
}
