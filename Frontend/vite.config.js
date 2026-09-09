import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { publicPageSeoPlugin } from './vite-plugins/publicPageSeo.js'

function backendOrigin() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Backend/.env')
  let port = '5050'
  try {
    const match = fs.readFileSync(envPath, 'utf8').match(/^PORT=(\d+)/m)
    if (match) port = match[1]
  } catch {
    /* défaut 5050 */
  }
  return `http://localhost:${port}`
}

const api = backendOrigin()

export default defineConfig({
  plugins: [react(), tailwindcss(), publicPageSeoPlugin(api)],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: api,
        changeOrigin: true,
      },
      '/uploads': {
        target: api,
        changeOrigin: true,
      },
      '/robots.txt': {
        target: api,
        changeOrigin: true,
        rewrite: () => '/api/public/robots.txt',
      },
      '/sitemap.xml': {
        target: api,
        changeOrigin: true,
        rewrite: () => '/api/public/sitemap.xml',
      },
    },
  },
})
