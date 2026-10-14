import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // En desarrollo /api se reenvía al backend. Por defecto producción; para uno
  // local: VITE_BACKEND_URL=http://127.0.0.1:3333 npm run dev
  const target = env.VITE_BACKEND_URL || 'https://bakend-cargaexpress-production-5dd5.up.railway.app'

  const proxy = {
    '/api': { target, changeOrigin: true, secure: target.startsWith('https') },
    '/storage': { target, changeOrigin: true, secure: target.startsWith('https') },
  }

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy }, // sin esto `vite preview` no reenvía /api y las pruebas e2e se cuelgan
  }
})
