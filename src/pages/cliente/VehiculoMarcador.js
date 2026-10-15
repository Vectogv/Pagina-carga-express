import L from 'leaflet';

// Mismas reglas y orden que tipoVehiculoMapaDe (app Flutter, lib/widgets/vehiculo_mapa.dart).
// Devuelve 'piaggio' | 'furgon' | 'camioneta'; cualquier otro texto o vacío cae en camioneta.
export function tipoVehiculoMapaDe(tipo) {
  const t = String(tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_-]+/g, ' ').trim();
  if (/piaggio|mini camion|moto|estacas/.test(t)) return 'piaggio';
  if (/camioneta|pickup|pick up/.test(t)) return 'camioneta';
  if (/furgon|camion|\bvan\b/.test(t)) return 'furgon';
  return 'camioneta';
}

/** Rumbo en grados (0 = norte, horario) de a hacia b; null si se movió menos de ~5 m. */
export function rumboEntre(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = (b.lat - a.lat) * 111320;
  const dLng = (b.lng - a.lng) * 111320 * Math.cos(rad(a.lat));
  if (Math.hypot(dLat, dLng) < 5) return null;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

// Dibujos portados de vehiculo_mapa.dart: vista cenital, frente hacia arriba, unidades relativas
// a s=1 (viewBox -.3 -.55 .6 1.1). Mismos colores y formas que la app.
export const COLOR_VEHICULO = '#2563EB'; // colorVehiculoAsignado de la app
const BLANCO = '#F8FAFC';
const CARPA = '#2B3442';
const COSTILLA = '#45505F';
const VERDE = '#16A34A';

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mezcla = (a, b, t) => {
  const A = hex(a); const B = hex(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

const rr = (l, t, r, b, rad, fill, extra = '') =>
  `<rect x="${l}" y="${t}" width="${+(r - l).toFixed(4)}" height="${+(b - t).toFixed(4)}" rx="${rad}" fill="${fill}" ${extra}/>`;
const ln = (x1, y1, x2, y2, stroke, w, op = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-opacity="${op}"/>`;
const faros = (x, y) => [-x, x].map((cx) => `<circle cx="${cx}" cy="${y}" r=".024" fill="#FFF4C2"/>`).join('');
const espejos = (y, x, c) => rr(-x - 0.06, y, -x, y + 0.04, 0.012, c) + rr(x, y, x + 0.06, y + 0.04, 0.012, c);
const costillas = (l, r, ys) => ys.map((y) => ln(l + 0.015, y, r - 0.015, y, COSTILLA, 0.014)).join('');

// Silueta exterior (contorno blanco y sombra).
const SILUETA = {
  piaggio: [[-0.14, -0.33, 0.14, -0.12, 0.07], [-0.17, -0.11, 0.17, 0.31, 0.03]],
  furgon: [[-0.2, -0.46, 0.2, -0.22, 0.08], [-0.23, -0.23, 0.23, 0.46, 0.035]],
  camioneta: [[-0.2, -0.42, 0.2, 0.42, 0.09]],
};
const siluetaSvg = (tipo, extra) => SILUETA[tipo].map((a) => rr(...a, 'none', extra)).join('');

function cuerpo(tipo, color) {
  const oscuro = mezcla(color, '#000000', 0.38);
  const claro = mezcla(color, '#FFFFFF', 0.22);
  const vidrio = mezcla('#FFFFFF', color, 0.14);
  if (tipo === 'piaggio') {
    return rr(-0.14, -0.33, 0.14, -0.12, 0.07, BLANCO, `stroke="${color}" stroke-width=".024"`)
      + rr(-0.09, -0.29, 0.09, -0.23, 0.025, mezcla(color, '#FFFFFF', 0.55))
      + `<circle cx="0" cy="-.315" r=".024" fill="#FFF4C2"/>`
      + rr(-0.17, -0.11, 0.17, 0.31, 0.03, BLANCO, `stroke="${oscuro}" stroke-opacity=".45" stroke-width=".012"`)
      + rr(-0.165, -0.09, -0.14, 0.29, 0, VERDE) + rr(0.14, -0.09, 0.165, 0.29, 0, VERDE)
      + rr(-0.13, -0.08, 0.13, 0.28, 0.03, CARPA) + costillas(-0.13, 0.13, [0.03, 0.14]);
  }
  if (tipo === 'furgon') {
    return espejos(-0.36, 0.2, oscuro)
      + rr(-0.2, -0.46, 0.2, -0.22, 0.08, color)
      + rr(-0.15, -0.42, 0.15, -0.35, 0.03, vidrio)
      + rr(-0.15, -0.33, 0.15, -0.27, 0.03, claro)
      + rr(-0.23, -0.23, 0.23, 0.46, 0.035, BLANCO, `stroke="${oscuro}" stroke-opacity=".55" stroke-width=".016"`)
      + rr(-0.23, -0.2, 0.23, -0.15, 0, color)
      + [0, 0.14, 0.28].map((y) => ln(-0.2, y, 0.2, y, '#CBD5E1', 0.012)).join('')
      + faros(0.13, -0.43);
  }
  return espejos(-0.2, 0.2, oscuro)
    + rr(-0.2, -0.42, 0.2, 0.42, 0.09, color)
    + ln(0, -0.38, 0, -0.27, oscuro, 0.012, 0.35)
    + rr(-0.16, -0.25, 0.16, -0.17, 0.03, vidrio)
    + rr(-0.16, -0.15, 0.16, 0, 0.04, claro)
    + rr(-0.15, 0.01, 0.15, 0.04, 0.015, vidrio)
    + rr(-0.165, 0.07, 0.165, 0.39, 0.03, CARPA) + costillas(-0.165, 0.165, [0.15, 0.23, 0.31])
    + faros(0.13, -0.39);
}

const DEFS = '<defs><filter id="vm-sombra" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".025"/></filter></defs>';

export const vehiculoSvg = (tipo, color = COLOR_VEHICULO, ancho = 30) => {
  const t = tipoVehiculoMapaDe(tipo);
  return `<svg viewBox="-.3 -.55 .6 1.1" width="${ancho}" height="${Math.round(ancho * 1.1 / 0.6)}" aria-hidden="true">${DEFS}`
    + `<g transform="translate(0 .045)" filter="url(#vm-sombra)" opacity=".35">${siluetaSvg(t, 'fill="#000"').replace(/fill="none"/g, 'fill="#000"')}</g>`
    + siluetaSvg(t, 'stroke="#fff" stroke-width=".06" stroke-linejoin="round"')
    + cuerpo(t, color) + '</svg>';
};

/**
 * Icono Leaflet del vehículo; el giro se aplica después con setRumbo sobre `.cli-veh`.
 * estado: 'on' (punto verde) | 'sin-senal' (amarillo) | undefined (sin punto).
 */
export const iconoVehiculo = (tipo, estado) => L.divIcon({
  className: 'cli-veh-icono',
  html: `<div class="cli-veh">${vehiculoSvg(tipo)}</div>${estado ? `<i class="vm-punto vm-punto--${estado}"></i>` : ''}`,
  iconSize: [30, 55],
  iconAnchor: [15, 27],
});

export const setRumbo = (marker, grados) => {
  const el = marker?.getElement()?.querySelector('.cli-veh');
  if (el) el.style.transform = `rotate(${grados}deg)`;
};
