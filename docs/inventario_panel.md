# Inventario del panel web (moderación y administración)

Fecha: 2026-10-09. Rama `feat/panel-moderacion`. Revisión de solo lectura hecha antes de tocar código; la columna **Resolución** dice qué se hizo con cada hallazgo en esta misma rama.

Regla general que ya se verificó: **ningún endpoint que llama la web falta en el servidor** y **ninguna ruta del menú es inexistente**. Lo que había eran filtros y conteos hechos en el navegador sobre listas parciales, datos a mano, duplicados entre los dos paneles y datos de clientes visibles sin caso abierto.

## 1. Panel del moderador

| # | Dónde | Hallazgo | Resolución |
|---|---|---|---|
| M1 | `DashboardPage` | "Viajes en tiempo real" usa `activeTrips.length` sobre una lista de 100. Coordenadas crudas del SOS (L344) y teléfono de quien activó el SOS (puede ser cliente). Texto "conversaciones con clientes". | Conteos del `dashboard` del servidor; el SOS enlaza al detalle con mapa en vez de coordenadas; texto corregido. |
| M2 | `DriversPage` (Verificación) | 3 llamadas de 100 por estado y pestaña "Todos" unida en el cliente; búsqueda en el cliente sin `?buscar=`; modal con 4 fotos fijas (sin SOAT, tecnomecánica ni tarjeta). | Búsqueda y estado al servidor (`?buscar=&estado=`), paginación real; documentos desde `/api/config/documentos-conductor`. |
| M3 | `DriverDetailPage` | Lista fija `DOCS_FICHA`. | Usa `useDocumentosConductor()` (endpoint). Pasa a ser la ficha compartida con el admin (`/moderator/drivers/:id` y `/admin/drivers/:id`). |
| M4 | `TripsPage` | Solo la página 1 (limit 50), sin paginación; teléfono del cliente en la tabla sin caso (L227). | Paginación real; cliente con `TarjetaPersona` (solo foto + nombre corto si `contactoVisible === false`); fila abre el detalle con mapa de recorrido. |
| M5 | `trips/TripDetailModal` | Mapa estático sin ubicación del conductor; lat/lng de la alerta como texto; teléfono/correo del cliente visibles si el servidor no manda `contactoVisible`. | `MapaRecorrido` (A/B, planeada azul, real rojo, último punto con hora, refresco 10 s si está activo) con `GET /api/moderator/trips/:id/recorrido`; contacto solo con `contactoVisible === true`. |
| M6 | `EmergenciasPage` / `EmergencyDetailModal` | Coordenadas como texto y enlace a Google Maps; `limit 10` fijo. | Mapa de recorrido con la marca del SOS; estado y filtros del servidor. |
| M7 | `ReservationsPage` | Teléfono del cliente sin caso (L465). | Oculto salvo `contactoVisible`. |
| M8 | `DisputesPage` | `?viaje=` se filtra en el cliente sobre 20; teléfono del cliente también en disputas resueltas. | Filtro al servidor; contacto solo con `contactoVisible`. |
| M9 | `CierresPage` / `ModeratorBadgesContext` | `closuresBadge = closures.length` (tope 50); `emergency/count` y `tickets/count` sin `ciudadParams`; sondeo 60 s. | Insignias con `total` del servidor y `ciudadParams`. |
| M10 | `ConversationThread`, `NewConversationModal`, `ConversationList` | Teléfono o correo del contacto en la cabecera y en el filtro, sin distinguir si es cliente con caso. | Cabecera con `TarjetaPersona`; teléfono/correo solo si el servidor los manda. |
| M11 | `CompanerosPage` | Filtro de rol en el cliente sobre 100. | Rol al servidor (`?rol=`). |
| M12 | Layout (`Sidebar`, `Header`) | El moderador real **no ve su zona** en ninguna parte fija (solo el admin tiene `CitySelector`). | Zona del moderador en la cabecera y en el pie del menú. |
| M13 | Sockets | Dashboard, Emergencias, Trips, EmergencyBanner, Badges y AvisosBoard abren cada uno su socket. | `useSocketPanel()` compartido (una conexión por sesión). |
| M14 | `useSondeo` | Existe pero ninguna página del moderador lo usa. | Lo usan el mapa en vivo y el mapa de recorrido. |
| M15 | Documentos | `utils/documentos.js` (`DOCUMENTOS_CONDUCTOR`, `faltantesDe` con lista de respaldo), `DOCS_FICHA`, fotos fijas en `DriversPage`, lista propia en `admin/VerificationsPage`. | Fuente única: `GET /api/config/documentos-conductor` vía `useDocumentosConductor()`; las listas locales quedan solo como respaldo si falla la red. |
| M16 | `NotificacionesPage` | Nombre del archivo no coincide ("Mis reportes"). | Renombrada a `MisReportesPage`. |

## 2. Panel del admin

| # | Dónde | Hallazgo | Resolución |
|---|---|---|---|
| A1 | `DashboardPage` | Emergencias/verificaciones/disputas con `limit 100` y "100+"; cuenta también las atendidas. | Totales de `X-Total-Count` y `?estado=`. |
| A2 | `DriversMapPage` | `getAllPages(getDrivers)` hasta 1000 cada 30 s, filtra en el cliente, centro a mano, `ciudadLabel` sin tilde. | Reemplazada por `MapaVivoPage` compartida: `GET /api/admin/drivers?online=1&zona=` cada 10 s, solo conectados, filtro de zona con `useZonas`, marcador abre el perfil. |
| A3 | `AvisosPage`, `TicketsPage`, `ConversationsPage` | Duplicadas con el moderador (envoltorios de los mismos boards). | Un solo archivo por página en `pages/panel/`, con `area` por ruta. |
| A4 | `ModeratorsPage` | `limit 100` sin paginar; zona y conteos en el cliente. | Paginación y `?zona=`. |
| A5 | `DriversPage` | Hasta 1000 en el cliente; búsqueda/estado/ciudad en el cliente; `notify` sin body. | `?zona=&online=&search=` al servidor; Notificar con `NotificarDocumentosDialog` y toast "Enviado: bandeja, push, correo" con `canales`. |
| A6 | `TripsPage` / `TripDetailModal` | Hasta 500 en el cliente; sin ciudad; `COMISION = 0.1` a mano. | `?zona=&estado=` al servidor; comisión real de `ganancias`; detalle con `MapaRecorrido` (`GET /api/admin/trips/:id/recorrido`). |
| A7 | `EmergenciesPage` | Sin `estado`, marca todo como pendiente, "resueltas" solo de la sesión, mensaje fijo al resolver, sin Atender ni zona. | `?estado=&zona=`, acción Atender, mapa de recorrido con marca del SOS. |
| A8 | `EarningsPage` / `CommissionsPage` | `COMISION = 0.1`, bruto = neto/0.9, "10 %"/"90 %" a mano; rama `isPaid` muerta. | Usa `montoBruto`/`comision` del servidor; texto sin porcentaje fijo; rama muerta borrada. |
| A9 | `VerificationsPage` | `limit 100` sin paginar (se pierden); lista de documentos propia; sin zona. | Paginación, `?zona=`, documentos del endpoint. |
| A10 | `ReportsPage` | Filtro y conteos en el cliente sobre 100; socket propio. | `useSocketPanel`; filtro al servidor. |
| A11 | `DisputesPage` | Sin page; "10 días" a mano en `ResolveDisputeModal`. | `?zona=`; texto del plazo viene del servidor (`diasPlazo`) o sin número fijo. |
| A12 | `CancellationRequestsPage` | Pestañas Aprobadas/Rechazadas solo de la sesión (el servidor solo devuelve pendientes). | Pestañas quitadas: solo pendientes con la nota de que el historial está en el viaje. |
| A13 | `ComunicadosPage`, `EncuestasPage` | Filtro de estado y conteos en el cliente sobre la página actual. | `?estado=&zona=` al servidor. |
| A14 | `ConfigPage` | No había "Días de inactividad". | Campo nuevo en General (`inactividadDias`, 1-365). |
| A15 | `useZonas` | `FALLBACK [cali, popayan, pasto]` a mano. | Se queda solo como respaldo si `/api/config/coverage` falla (documentado). |
| A16 | `DriverActionDialogs` | `notify` sin cuerpo. | Ver A5. |

## 3. Decisiones de estructura

- **Menú por tareas** (moderador): Inicio de mi zona · Conductores (Directorio, Por verificar, Inactivos) · Casos (SOS, Disputas, Tickets, Conversaciones, Cierres) · Mapa en vivo · Comunicación (Comunicados, Avisos, Encuestas, Equipo) · Mis reportes. Admin: Inicio · Personas (Usuarios, Conductores, Clientes, Moderadores, Verificaciones) · Casos (SOS, Disputas, Tickets, Conversaciones, Reportes, Cancelaciones) · Viajes · Mapa en vivo · Finanzas (Pagos, Comisiones, Ganancias, Referidos, Empresas) · Comunicación (Comunicados, Avisos, Encuestas, Enviar comunicación, Pendientes) · Configuración (Config, Respaldos).
- **URLs viejas** siguen funcionando con `<Navigate replace>`.
- **Perfiles navegables**: todo nombre de conductor o cliente en listas, detalles, SOS y mapa abre `/{area}/drivers/:id` o `/{area}/clients/:id`.
- **Ubicación**: solo conductores conectados (`online`), regla del servidor (`ubicacionSiConectado`); el moderador ve los de su zona, el admin todos.
- **Recorrido real**: `GET /api/{admin|moderator}/trips/:id/recorrido` → `{activo, origen, destino, planeada{coords[[lat,lng]]}, recorrido[{lat,lng,at}], ultimoPunto, conductorUbicacion}`.

## 4. Estado al cerrar esta pasada (2026-10-09)

**Terminado en el código:**
- `MapaRecorrido` (planeada azul, recorrido real rojo, marca del SOS) en los 4 detalles: viaje y SOS del moderador, viaje y SOS del admin. Para un SOS sin viaje se mantiene el mapa estático (`RouteMap`) con solo el punto.
- "Días de inactividad" (`inactividadDias`, 1–365) en Configuración → General.
- `textoCanales` una sola vez en `src/utils/canales.js` (se borraron las 3 copias).
- Limpieza: `CeldaConductor` sin uso, token de Mapbox muerto en `moderator/TripsPage`.

**Pendiente (hallazgos de las tablas que siguen sin resolver):**
- M (moderador): `TripsPage` sin paginación (sigue `limit 50`); `ConversationThread`/`ConversationList`/`NewConversationModal` todavía sin `TarjetaPersona`.
- A (admin): `EmergenciesPage` sin `?estado=&zona=` (A7); `VerificationsPage` sin paginación ni `?zona=` ni documentos del endpoint (A9); `ReportsPage` filtro al servidor (A10); `ComunicadosPage`/`EncuestasPage` `?estado=&zona=` (A13); páginas compartidas del admin aún duplicadas (A3).
- Todo lo que llama a los endpoints de `d5cc88e`/`b8d14a9`/`0950445` falla hasta que Railway pase de `63ae205` (recorrido, perfil de cliente, `drivers?online`, `inactividadDias`, `canales`, documentos del conductor).
