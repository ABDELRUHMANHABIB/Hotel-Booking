import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
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
