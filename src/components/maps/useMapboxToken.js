import { useEffect, useState } from 'react';
import { getMapboxToken } from '../../api/moderator';

// El token de Mapbox lo entrega GET /api/config/mapbox. Se cachea a nivel de módulo para
// pedirlo una sola vez por sesión (y no en cada render / apertura de modal).
//
// El backend responde { mapboxAccessToken } (app/controllers/mapbox_controller.ts).
// Aquí se leía solo `token`/`accessToken`, así que el token nunca llegaba y el mapa
// del SOS caía siempre al modo degradado aunque estuviera bien configurado.
const RETRY_MS = 60000;

/** Nombre del campo según el backend, con alias tolerados por si cambia. */
const tokenDe = (data) => data?.mapboxAccessToken || data?.token || data?.accessToken || '';

let cached = null; // null = sin pedir, '' = no disponible, string = token
let pending = null;
let failedAt = 0;

/** Devuelve el token (o '' si no hay). Nunca lanza: si falla, degrada a cadena vacía. */
export function loadMapboxToken() {
  if (cached) return Promise.resolve(cached);
  if (cached === '' && Date.now() - failedAt < RETRY_MS) return Promise.resolve('');
  if (!pending) {
    pending = getMapboxToken()
      .then((res) => tokenDe(res.data))
      .catch(() => '')
      .then((token) => {
        cached = token;
        if (!token) failedAt = Date.now();
        pending = null;
        return token;
      });
  }
  return pending;
}

/**
 * Hook: { token, cargando }. `cargando` evita mostrar el aviso de "sin mapa"
 * mientras la petición del token está en curso.
 */
export default function useMapboxToken() {
  const [estado, setEstado] = useState(() => ({ token: cached || null, cargando: cached === null }));

  useEffect(() => {
    let alive = true;
    loadMapboxToken().then((value) => {
      if (alive) setEstado({ token: value || null, cargando: false });
    });
    return () => { alive = false; };
  }, []);

  return estado;
}
