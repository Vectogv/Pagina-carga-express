import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // En desarrollo /api se reenvía al backend. Por defecto producción; para uno
  // local: VITE_BACKEND_URL=http://127.0.0.1:3333 npm run dev
  const target = env.VITE_BACKEND_URL || 'https://bakend-cargaexpress-production.up.railway.app'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target, changeOrigin: true, secure: target.startsWith('https') },
        '/storage': { target, changeOrigin: true, secure: target.startsWith('https') },
      },
    },
  }
})
