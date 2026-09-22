import { useEffect, useState } from 'react';
import api from '../api/axios';

// Ciudades de respaldo mientras carga (o si aún no hay zonas configuradas).
const FALLBACK = [
  { value: 'cali', label: 'Cali' },
  { value: 'popayan', label: 'Popayán' },
  { value: 'pasto', label: 'Pasto' },
];

let cache = null;
// Zonas tal como las devuelve el backend (con su geometría: rectángulo o
// centro + radio). Se guardan aparte para poder dibujar el límite en un mapa.
let cacheCompleta = null;
let inflight = null;
const listeners = new Set();
const listenersCompleta = new Set();

function load() {
  inflight = inflight || api.get('/api/config/coverage')
    .then(({ data }) => {
      const zonas = Array.isArray(data?.zonas) ? data.zonas : [];
      cacheCompleta = zonas;
      cache = zonas.length ? zonas.map((z) => ({ value: z.clave, label: z.nombre })) : FALLBACK;
    })
    .catch(() => {
      cache = cache || FALLBACK;
      cacheCompleta = cacheCompleta || [];
    })
    .finally(() => {
      inflight = null;
      listeners.forEach((fn) => fn(cache));
      listenersCompleta.forEach((fn) => fn(cacheCompleta));
    });
  return inflight;
}

/** Invalida la caché (p. ej. después de guardar la cobertura). */
export function refreshZonas() {
  cache = null;
  cacheCompleta = null;
  return load();
}

/**
 * Zonas completas, con geometría, para dibujarlas. Devuelve
 * { zonas, cargando }: `zonas` es [] mientras carga o si no hay ninguna
 * configurada (ojo: sin zonas la plataforma no restringe cobertura).
 */
export function useZonasCompletas() {
  const [zonas, setZonas] = useState(cacheCompleta);

  useEffect(() => {
    listenersCompleta.add(setZonas);
    // Si la carga terminó entre el primer render y este efecto, el aviso ya pasó:
    // hay que tomar la caché a mano o el estado se queda como estaba para siempre.
    if (cacheCompleta) setZonas(cacheCompleta);
    else load();
    return () => listenersCompleta.delete(setZonas);
  }, []);

  return { zonas: zonas || [], cargando: zonas === null };
}

/**
 * Ciudades donde opera la plataforma, definidas por el admin en
 * Configuración → Cobertura. Devuelve [{ value: clave, label: nombre }].
 */
export function useZonas() {
  const [zonas, setZonas] = useState(cache || FALLBACK);

  useEffect(() => {
    listeners.add(setZonas);
    // Igual que arriba: si la carga acabó antes de este efecto, el aviso ya pasó y
    // sin esto el selector se quedaba con las ciudades de respaldo.
    if (cache) setZonas(cache);
    else load();
    return () => listeners.delete(setZonas);
  }, []);

  return zonas;
}

export const zonaLabelFrom = (zonas, z) => {
  if (!z) return '—';
  const key = String(z).toLowerCase();
  return zonas.find((o) => o.value === key)?.label || key.charAt(0).toUpperCase() + key.slice(1);
};
