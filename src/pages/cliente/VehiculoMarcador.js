import L from 'leaflet';

// Mismas reglas que tipoVehiculoMapaDe (app Flutter, lib/widgets/vehiculo_mapa.dart).
export function tipoVehiculoMapaDe(tipo) {
  const t = String(tipo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ').trim();
  if (!t) return 'camion';
  if (t.includes('moto')) return 'moto';
  if (/camioneta|pickup|pick up/.test(t)) return 'camioneta';
  if (/furgon|\bvan\b/.test(t)) return 'furgon';
  if (/sedan|carro|automovil|hatchback|taxi|\bauto\b/.test(t)) return 'carro';
  return 'camion';
}

/** Rumbo en grados (0 = norte, horario) de a hacia b; null si se movió menos de ~5 m. */
export function rumboEntre(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos(rad(a.lat));
  if (Math.hypot(dLat, dLng) < 5) return null;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

// Siluetas vistas desde arriba (frente hacia arriba), viewBox 40x64, con degradados para dar volumen.
const DEFS = `<defs>
<linearGradient id="vm-c" x1="0" x2="1"><stop offset="0" stop-color="#1e4fc4"/><stop offset=".45" stop-color="#4f86f0"/><stop offset="1" stop-color="#173f9e"/></linearGradient>
<linearGradient id="vm-b" x1="0" x2="1"><stop offset="0" stop-color="#e8edf6"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#c9d3e6"/></linearGradient>
<linearGradient id="vm-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d7494"/><stop offset="1" stop-color="#1b2a44"/></linearGradient>
</defs>`;
const SOMBRA = '<ellipse cx="20" cy="36" rx="17" ry="29" fill="#0a2259" opacity=".22"/>';
const RUEDAS = (ys) => ys.map((y) => `<rect x="2" y="${y}" width="5" height="10" rx="2" fill="#111"/><rect x="33" y="${y}" width="5" height="10" rx="2" fill="#111"/>`).join('');

const DIBUJO = {
  furgon: `${SOMBRA}${RUEDAS([12, 44])}<rect x="6" y="4" width="28" height="56" rx="7" fill="url(#vm-b)" stroke="#9fb0cf"/><path d="M9 6h22v10H9z" fill="url(#vm-g)"/><rect x="9" y="20" width="22" height="36" rx="3" fill="#f4f7fc"/><path d="M20 20v36M9 38h22" stroke="#d3dbea"/><rect x="12" y="25" width="16" height="6" rx="2" fill="#1656d6"/>`,
  camion: `${SOMBRA}${RUEDAS([10, 36, 50])}<rect x="7" y="3" width="26" height="16" rx="5" fill="url(#vm-c)"/><path d="M10 6h20v7H10z" fill="url(#vm-g)"/><rect x="6" y="21" width="28" height="41" rx="3" fill="url(#vm-b)" stroke="#9fb0cf"/><path d="M12 25v33M20 25v33M28 25v33" stroke="#d3dbea"/>`,
  camioneta: `${SOMBRA}${RUEDAS([10, 44])}<rect x="7" y="3" width="26" height="58" rx="8" fill="url(#vm-c)"/><path d="M10 8h20l-2 9H12z" fill="url(#vm-g)"/><rect x="10" y="30" width="20" height="28" rx="3" fill="#173f9e"/><rect x="12" y="32" width="16" height="24" rx="2" fill="#d9a441" opacity=".85"/><path d="M12 32l16 24M28 32L12 56" stroke="#a97a22"/>`,
  carro: `${SOMBRA}${RUEDAS([12, 42])}<rect x="8" y="5" width="24" height="54" rx="10" fill="url(#vm-c)"/><path d="M11 17h18l-1.5 8h-15z" fill="url(#vm-g)"/><rect x="11" y="27" width="18" height="12" rx="3" fill="#2d62d6"/><path d="M12 42h16l1.5 8h-19z" fill="url(#vm-g)"/>`,
  moto: `<ellipse cx="20" cy="36" rx="8" ry="27" fill="#0a2259" opacity=".22"/><rect x="17" y="3" width="6" height="14" rx="3" fill="#111"/><rect x="17" y="47" width="6" height="14" rx="3" fill="#111"/><rect x="14" y="16" width="12" height="32" rx="6" fill="url(#vm-c)"/><path d="M8 17h24" stroke="#111" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="30" r="4.5" fill="#f4f7fc"/>`,
};

export const vehiculoSvg = (tipo) =>
  `<svg viewBox="0 0 40 64" width="30" height="48" aria-hidden="true">${DEFS}${DIBUJO[tipoVehiculoMapaDe(tipo)]}</svg>`;

/** Icono Leaflet del vehículo; el giro se aplica después con setRumbo sobre `.cli-veh`. */
export const iconoVehiculo = (tipo) => L.divIcon({
  className: 'cli-veh-icono',
  html: `<div class="cli-veh">${vehiculoSvg(tipo)}</div>`,
  iconSize: [30, 48],
  iconAnchor: [15, 24],
});

export const setRumbo = (marker, grados) => {
  const el = marker?.getElement()?.querySelector('.cli-veh');
  if (el) el.style.transform = `rotate(${grados}deg)`;
};
