# Carga Express · Panel web

Panel de administración y moderación de Carga Express (React 19 + Vite). Consume el backend AdonisJS (`bakend-cargaexpress`).

## Áreas

- `/admin`: administradores (usuarios, conductores, viajes, finanzas, disputas, configuración, backups).
- `/moderator`: moderadores por ciudad (centro de control, viajes, emergencias en vivo, conductores, conversatorio).

El rol se toma de `GET /api/users/profile` (`rol`, `esModerador`, `zonaModerador`).

## Desarrollo

```bash
npm install
cp .env.example .env   # opcional: VITE_SENTRY_DSN, VITE_BACKEND_URL
npm run dev
```

- Las llamadas HTTP van a `/api`, que se reenvía al backend (`vite.config.js` en desarrollo, `vercel.json` en producción).
- Los sockets y los archivos subidos usan la URL absoluta de `src/config.js` (`VITE_BACKEND_URL`).

## Estructura

```
src/
  api/          axios (auth + refresh) y funciones por área
  components/
    ui/         design system: Button, DataTable, Modal, StatCard, StatusBadge, …
    layout/     Sidebar, Header (topbar) y navegación (sidebarContent.js)
  contexts/     Auth, ciudad del moderador, badges en tiempo real
  pages/        admin/ y moderator/ (subcarpetas para modales y partes de cada página)
  styles/       tokens.css (variables) y ui.css (clases de layout)
  utils/        format.js (moneda, fechas, errores), roles.js, storage.js
```

## Convenciones de UI

- Colores, espaciados y radios **solo** con variables de `styles/tokens.css`.
- Páginas con `<div className="page">` + `PageHeader`, `toolbar`, `DataTable`/`Card`.
- Iconos de `lucide-react`; sin emojis en la interfaz.
- Estados del backend con `StatusBadge` (mapa único en `components/ui/Badge/status.js`).
- Formateo con `utils/format.js` (`formatCurrency`, `formatDateTime`, `errorMessage`, `toList`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` | ESLint (debe quedar en 0 problemas) |
| `npm run build` | Build de producción en `dist/` |
