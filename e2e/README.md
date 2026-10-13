# Pruebas e2e del panel

Puppeteer (`puppeteer-core`) + el Chrome instalado, sin cabeza. Necesita `npm run dev` en 5173 (o `E2E_WEB_URL`).

1. Crea `e2e/.env.e2e` (ignorado por git) o exporta las variables: `E2E_ADMIN` y `E2E_ADMIN_PASS`, `E2E_MOD` y `E2E_MOD_PASS`, `E2E_CLIENTE` y `E2E_CLIENTE_PASS` (correo y clave de cada rol; nunca van en el código). Opcionales: `E2E_WEB_URL` (por defecto `http://localhost:5173`), `E2E_API_URL` (por defecto producción), `E2E_CHROME`.
2. `npm run e2e:humo` (o `npm run e2e:humo -- admin`): entra con cada rol, abre todas las rutas de `src/App.jsx` a 360/768/1366/1920 px y sale con 1 si hay error de consola, "Algo salió mal", desborde horizontal o respuesta 4xx/5xx de la API. Solo lee: no crea, edita ni borra datos. Capturas en `e2e/out/` (ignorado).
3. `npm run e2e:flujo -- ejemplo`: ejecuta `e2e/flujos/<nombre>.mjs` (`export default async ({browser, lib, api}) => {}`).
