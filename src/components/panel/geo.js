export const POPAYAN = [2.4448, -76.6147];

// Ubicación válida: números finitos dentro de rango (y no 0,0).
export function posicionDe(p) {
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return [lat, lng];
}
