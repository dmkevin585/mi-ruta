import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' permite publicar en GitHub Pages en cualquier ruta (usuario.github.io/mi-ruta)
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mi Ruta',
        short_name: 'Mi Ruta',
        description: 'Registra tus pedidos y reparte tu plata: cuota, bencina y bolsillos.',
        lang: 'es-CL',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F3F4F8',
        theme_color: '#1F4FFF',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: { environment: 'node' }
})
