import Link from 'next/link'
import { Logo } from '@/components/layout/logo'

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 lg:px-16">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand-800 p-16 text-white lg:flex lg:flex-col lg:justify-end">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-96 rounded-full bg-brand-600/50 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-16 size-96 rounded-full bg-gold/20 blur-3xl"
        />
        <blockquote className="relative z-10 space-y-6">
          <p className="font-display text-3xl leading-snug">
            &ldquo;Seu salão organizado. Seus clientes mais próximos. Seu negócio
            crescendo.&rdquo;
          </p>
          <p className="text-sm text-brand-100">
            Agenda, ficha capilar, histórico químico, financeiro, estoque,
            comissões e WhatsApp — em um só lugar.
          </p>
        </blockquote>
      </aside>
    </div>
  )
}
