// Normaliza los datos de una emergencia (+ detalle del viaje, si se cargó) a las props
// de <RouteMap />. Sigue el contrato backend/panel: viaje.origenCoords, viaje.destinoCoords,
// conductorUbicacion y sos.{distanciaOrigenKm,distanciaDestinoKm,avanceRuta} pueden venir null.

const EARTH_RADIUS_KM = 6371;

/** Extrae {lat,lng} de cualquiera de las formas que usa el backend. null si no es usable. */
export function toPoint(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const lat = Number(raw.lat ?? raw.latitud ?? raw.latitude);
  const lng = Number(raw.lng ?? raw.lon ?? raw.longitud ?? raw.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Distancia aproximada en km (haversine). Solo se usa como respaldo si el backend no la envía. */
export function distanciaKm(a, b) {
  if (!a || !b) return null;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const texto = (v) => {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object') return String(v.direccion || v.nombre || v.address || '').trim();
  return '';
};

/**
 * @returns {{origen, destino, sos, conductor, info}} props listas para <RouteMap />.
 *          Cada campo puede ser null; RouteMap lo maneja.
 */
export function sosRouteProps(emergency, trip) {
  if (!emergency) return null;
  const viaje = emergency.viaje || emergency.trip || {};

  // Coordenadas nuevas del contrato; si aún no llegan, se usa el detalle del viaje.
  const origen = toPoint(viaje.origenCoords) || toPoint(trip?.origen) || toPoint(trip?.origenCoords);
  const destino = toPoint(viaje.destinoCoords) || toPoint(trip?.destino) || toPoint(trip?.destinoCoords);
  const sos = toPoint(emergency);
  const conductor = toPoint(emergency.conductorUbicacion)
    || toPoint(trip?.conductorUbicacion)
    || toPoint(trip?.conductor?.ubicacion);

  const origenLabel = texto(viaje.origen) || texto(trip?.origen);
  const destinoLabel = texto(viaje.destino) || texto(trip?.destino);

  const backend = emergency.sos;
  let info = null;
  if (backend && (backend.distanciaOrigenKm != null || backend.distanciaDestinoKm != null)) {
    info = {
      distanciaOrigenKm: numero(backend.distanciaOrigenKm),
      distanciaDestinoKm: numero(backend.distanciaDestinoKm),
      avanceRuta: numero(backend.avanceRuta),
    };
  } else if (sos && (origen || destino)) {
    // Respaldo mientras el backend no envíe el bloque `sos`: se calcula en el panel y se marca aprox.
    const dOrigen = origen ? distanciaKm(origen, sos) : null;
    const dDestino = destino ? distanciaKm(destino, sos) : null;
    const total = origen && destino ? distanciaKm(origen, destino) : null;
    info = {
      distanciaOrigenKm: dOrigen,
      distanciaDestinoKm: dDestino,
      avanceRuta: total && total > 0.05 && dOrigen != null
        ? Math.min(1, Math.max(0, dOrigen / total))
        : null,
      aproximado: true,
    };
  }

  return {
    origen: origen ? { ...origen, label: origenLabel || 'Origen' } : null,
    destino: destino ? { ...destino, label: destinoLabel || 'Destino' } : null,
    sos,
    conductor,
    info,
  };
}

/** true si hay al menos un punto que valga la pena dibujar. */
export const hasRoutePoints = (props) => !!(props
  && (props.sos || props.conductor || (props.origen && props.destino)));
