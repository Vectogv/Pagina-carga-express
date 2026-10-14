import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './styles/tokens.css'
import './index.css'
import './styles/ui.css'
import App from './App.jsx'
import ErrorFallback from './components/ErrorFallback.jsx'

// Tras un despliegue, los chunks viejos devuelven HTML: recarga una sola vez.
function recargarUnaVez() {
  try {
    if (sessionStorage.getItem('chunk_recargado')) return false;
    sessionStorage.setItem('chunk_recargado', '1');
  } catch { /* sin sessionStorage: no recargar para evitar bucles */ return false; }
  window.location.reload();
  return true;
}
window.addEventListener('vite:preloadError', (e) => { if (recargarUnaVez()) e.preventDefault(); });

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />} onError={(err) => { if (/dynamically imported module|ChunkLoadError|Importing a module script failed/i.test(String(err?.message || err))) recargarUnaVez(); }}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
