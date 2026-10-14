/**
 * Deja una firma lista para el contrato: recorta el margen en blanco, quita el fondo
 * (transparente) y la devuelve como PNG. Sirve para la firma dibujada, la foto de la
 * firma en papel y la firma de gerencia, así todas encajan igual sobre la línea.
 */
const MAX_LADO = 1400;

/** Grupo de índices con tinta (permitiendo huecos cortos) que más tinta tiene: descarta puntitos sueltos. */
function tramoPrincipal(cuentas, hueco) {
  let mejor = null;
  let actual = null;
  cuentas.forEach((n, i) => {
    if (n === 0) return;
    if (actual && i - actual.fin <= hueco) { actual.fin = i; actual.tinta += n; }
    else { actual = { ini: i, fin: i, tinta: n }; }
    if (!mejor || actual.tinta > mejor.tinta) mejor = actual;
  });
  return mejor;
}

function cargar(blob) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen de la firma.')); };
    img.src = url;
  });
}

export async function limpiarFirma(blob) {
  const img = await cargar(blob);
  const k = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
  const w = Math.round(img.width * k);
  const h = Math.round(img.height * k);
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const datos = ctx.getImageData(0, 0, w, h);
  const px = datos.data;

  // Luminancia sobre fondo blanco (lo transparente cuenta como papel).
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i += 1) {
    const a = px[i * 4 + 3] / 255;
    const l = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    lum[i] = a * l + (1 - a) * 255;
  }
  const filas = new Array(h).fill(0);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (lum[y * w + x] < 140) filas[y] += 1;
  const fy = tramoPrincipal(filas.map((n) => (n >= 2 ? n : 0)), Math.round(h * 0.03) + 2);
  if (!fy) throw new Error('No se ve ninguna firma en la imagen.');
  const cols = new Array(w).fill(0);
  for (let y = fy.ini; y <= fy.fin; y += 1) for (let x = 0; x < w; x += 1) if (lum[y * w + x] < 140) cols[x] += 1;
  const fx = tramoPrincipal(cols.map((n) => (n >= 2 ? n : 0)), Math.round(w * 0.06) + 2);

  const m = 4;
  const x0 = Math.max(0, fx.ini - m);
  const y0 = Math.max(0, fy.ini - m);
  const cw = Math.min(w - 1, fx.fin + m) - x0 + 1;
  const ch = Math.min(h - 1, fy.fin + m) - y0 + 1;
  const salida = document.createElement('canvas');
  salida.width = cw;
  salida.height = ch;
  const sctx = salida.getContext('2d');
  const sd = sctx.createImageData(cw, ch);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const v = lum[(y + y0) * w + (x + x0)];
      const o = (y * cw + x) * 4;
      // Tinta azul oscura; el papel (claro) queda transparente con borde suave.
      sd.data[o] = 17; sd.data[o + 1] = 24; sd.data[o + 2] = 39;
      sd.data[o + 3] = v > 200 ? 0 : Math.min(255, ((215 - v) * 255) / 120);
    }
  }
  sctx.putImageData(sd, 0, 0);
  return new Promise((ok) => salida.toBlob(ok, 'image/png'));
}
