export const POPAYAN = [2.4448, -76.6147];

// Ubicación válida: números finitos dentro de rango (y no 0,0).
// Acepta {lat,lng} o una tupla [lat, lng] (así manda el servidor planeada.coords,
// ver trip_route_service.ts: ya convierte el [lng,lat] de Mapbox a [lat,lng]).
export function posicionDe(p) {
  const lat = Number(Array.isArray(p) ? p[0] : p?.lat);
  const lng = Number(Array.isArray(p) ? p[1] : p?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return [lat, lng];
}

const R_TIERRA_M = 6371000;
const rad = (g) => (g * Math.PI) / 180;

/** Distancia haversine en metros entre dos tuplas [lat, lng]. */
export function distanciaM(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** Índice del punto de `coords` ([lat,lng][]) más cercano a `punto`; -1 si no hay. */
export function indiceMasCercano(coords, punto) {
  let mejor = -1;
  let menor = Infinity;
  coords.forEach((c, i) => {
    const d = distanciaM(c, punto);
    if (d < menor) { menor = d; mejor = i; }
  });
  return mejor;
}

/**
 * Corta una ruta en el punto más cercano a `punto` (p. ej. donde se activó el SOS
 * o donde va el conductor). Devuelve { recorrido, pendiente }: el tramo ya andado
 * (coords[0..i] + punto) y el que faltaba (punto + coords[i..]). Función pura.
 * Con menos de 2 puntos o sin `punto` devuelve null.
 */
export function cortarRutaEn(coords, punto) {
  const p = posicionDe(punto);
  if (!p || !Array.isArray(coords) || coords.length < 2) return null;
  const i = indiceMasCercano(coords, p);
  if (i < 0) return null;
  return {
    recorrido: [...coords.slice(0, i + 1), p],
    pendiente: [p, ...coords.slice(i)],
  };
}

/**
 * Qué se pinta en rojo (ya recorrido) y en azul (lo que faltaba).
 * `corte` es el punto donde termina lo recorrido (el SOS, o el conductor en un viaje activo).
 * - Con recorrido real: rojo = real (cortado en `corte` si lo hay); azul = planeada
 *   desde `corte`, o entera si no hay corte.
 * - Sin recorrido real pero con `corte`: se aproxima cortando la planeada en el punto
 *   más cercano (`aproximado: true`).
 */
export function tramosDe({ planeada, real, corte }) {
  if (real.length > 1) {
    const r = corte ? cortarRutaEn(real, corte) : null;
    const p = corte ? cortarRutaEn(planeada, corte) : null;
    return { rojo: r ? r.recorrido : real, azul: p ? p.pendiente : planeada, aproximado: false };
  }
  const p = corte ? cortarRutaEn(planeada, corte) : null;
  if (p) return { rojo: p.recorrido, azul: p.pendiente, aproximado: true };
  return { rojo: [], azul: planeada, aproximado: false };
}

/**
 * Puntos de un caso SOS a partir de la alerta (GET /api/{admin,moderator}/emergenc*) y, si ya
 * se cargó, el detalle del viaje. Devuelve null sin alerta. `sos`, `conductor`, `origen` y
 * `destino` van como {lat,lng} (o null); `viajeId` decide si hay recorrido que pedir.
 */
export function puntosDeEmergencia(e, viaje) {
  if (!e || typeof e !== 'object') return null;
  const v = e.viaje || e.trip || {};
  const aObj = (p) => { const t = posicionDe(p); return t ? { lat: t[0], lng: t[1] } : null; };
  const sos = aObj(e);
  return {
    viajeId: e.viajeId || e.tripId || v.id || viaje?.id || null,
    sos: sos ? { ...sos, at: e.createdAt } : null,
    conductor: aObj(e.conductorUbicacion) || aObj(viaje?.conductorUbicacion) || null,
    origen: aObj(v.origenCoords) || aObj(viaje?.origen) || null,
    destino: aObj(v.destinoCoords) || aObj(viaje?.destino) || null,
  };
}

/** true si el caso tiene algo que dibujar (viaje asociado o coordenadas del SOS). */
export const tieneMapaEmergencia = (e) => {
  const p = puntosDeEmergencia(e);
  return !!(p && (p.viajeId || p.sos || p.conductor));
};
