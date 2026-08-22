import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'BellaGestão · Gestão inteligente para salões de beleza',
    template: '%s · BellaGestão',
  },
  description:
    'Agenda, clientes, financeiro, WhatsApp, estoque e inteligência artificial em uma única plataforma.',
  applicationName: 'BellaGestão',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'BellaGestão' },
}

export const viewport: Viewport = {
  themeColor: '#8e3d61',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}
