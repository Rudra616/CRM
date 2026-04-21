import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'node:buffer'

const MAX_LOG_BODY_CHARS = 4000
const API_TERMINAL_LOGS_ENABLED = process.env.VITE_API_TERMINAL_LOGS !== '0'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (!API_TERMINAL_LOGS_ENABLED) return
            // Ask backend for uncompressed payload so response body is readable in terminal logs.
            proxyReq.setHeader('accept-encoding', 'identity')
            console.log(`[API REQ] ${req.method} ${req.url}`)
          })

          proxy.on('proxyRes', (proxyRes, req) => {
            if (!API_TERMINAL_LOGS_ENABLED) return

            const chunks: Buffer[] = []
            proxyRes.on('data', (chunk) => {
              if (Buffer.isBuffer(chunk)) chunks.push(chunk)
              else if (typeof chunk === 'string') chunks.push(Buffer.from(chunk))
            })

            proxyRes.on('end', () => {
              const status = proxyRes.statusCode ?? 0
              const raw = Buffer.concat(chunks).toString('utf8')
              const body =
                raw.length > MAX_LOG_BODY_CHARS
                  ? `${raw.slice(0, MAX_LOG_BODY_CHARS)}... [truncated]`
                  : raw

              console.log(`[API RES] ${req.method} ${req.url} -> ${status}`)
              if (body) {
                console.log(`[API BODY] ${body}`)
              } else {
                console.log('[API BODY] <empty>')
              }
            })
          })
        },
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
