// Las zonas/ciudades vienen de Configuración → Cobertura (hook useZonas).

export const getZonaModerador = (u) => u?.zonaModerador || u?.zona_moderador || '';

export const userId = (u) => u?.id || u?._id;

/**
 * Paginación desde las cabeceras X-Total-Count / X-Last-Page (el cuerpo es un array).
 * Sin cabeceras: hay otra página si la actual vino llena.
 */
export function paginacionDe(headers, len, page, limit) {
  const total = Number(headers?.['x-total-count']);
  const last = Number(headers?.['x-last-page']);
  const hayTotal = headers?.['x-total-count'] != null && Number.isFinite(total);
  if (headers?.['x-last-page'] != null && Number.isFinite(last) && last > 0) return { total: hayTotal ? total : undefined, totalPages: last };
  if (hayTotal) return { total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  return { total: undefined, totalPages: len >= limit ? page + 1 : page };
}
