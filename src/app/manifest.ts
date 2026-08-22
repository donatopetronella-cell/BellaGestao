import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BellaGestão',
    short_name: 'BellaGestão',
    description:
      'Agenda, clientes, financeiro, WhatsApp, estoque e inteligência artificial para salões de beleza.',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fbf9f8',
    theme_color: '#8e3d61',
    lang: 'pt-BR',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
