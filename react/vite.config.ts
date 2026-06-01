import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND_URL =
    env.VITE_BACKEND_URL?.trim() || env.BACKEND_URL?.trim() || 'http://localhost:3000'

  return {
    server: {
      port: 5173,
      hmr: false,
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
          timeout: 5 * 60 * 1000,
          proxyTimeout: 5 * 60 * 1000,
        },
        '/uploads': {
          target: BACKEND_URL,
          changeOrigin: true,
        },
      },
    },

    plugins: [react()],
  }
})
