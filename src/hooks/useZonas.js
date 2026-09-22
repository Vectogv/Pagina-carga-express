import { useEffect, useState } from 'react';
import api from '../api/axios';

// Ciudades de respaldo mientras carga (o si aún no hay zonas configuradas).
const FALLBACK = [
  { value: 'cali', label: 'Cali' },
  { value: 'popayan', label: 'Popayán' },
  { value: 'pasto', label: 'Pasto' },
];

let cache = null;
let inflight = null;
const listeners = new Set();

function load() {
  inflight = inflight || api.get('/api/config/coverage')
    .then(({ data }) => {
      const zonas = Array.isArray(data?.zonas) ? data.zonas : [];
      cache = zonas.length ? zonas.map((z) => ({ value: z.clave, label: z.nombre })) : FALLBACK;
    })
    .catch(() => { cache = cache || FALLBACK; })
    .finally(() => {
      inflight = null;
      listeners.forEach((fn) => fn(cache));
    });
  return inflight;
}

/** Invalida la caché (p. ej. después de guardar la cobertura). */
export function refreshZonas() {
  cache = null;
  return load();
}

/**
 * Ciudades donde opera la plataforma, definidas por el admin en
 * Configuración → Cobertura. Devuelve [{ value: clave, label: nombre }].
 */
export function useZonas() {
  const [zonas, setZonas] = useState(cache || FALLBACK);

  useEffect(() => {
    listeners.add(setZonas);
    if (!cache) load();
    return () => listeners.delete(setZonas);
  }, []);

  return zonas;
}

export const zonaLabelFrom = (zonas, z) => {
  if (!z) return '—';
  const key = String(z).toLowerCase();
  return zonas.find((o) => o.value === key)?.label || key.charAt(0).toUpperCase() + key.slice(1);
};
