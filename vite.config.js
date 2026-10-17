import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { env as nodeEnv } from 'node:process'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    base: env.VITE_BASE_PATH || (
      nodeEnv.VERCEL
        ? '/'
        : mode === 'production'
          ? '/Hotel-Booking/'
          : '/'
    ),
    plugins: [
      react(),
      tailwindcss()
    ],
    server: {
      proxy: {
        '/api': `http://localhost:${env.API_PORT || 4242}`,
      },
    },
  }
})
