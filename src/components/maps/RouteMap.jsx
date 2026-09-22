import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, MapPinOff } from 'lucide-react';
import useMapboxToken from './useMapboxToken';
import './RouteMap.css';

// La Static Images API de Mapbox solo admite colores hex literales (no variables CSS).
// Equivalen a --success, --primary, --danger y --warning de src/styles/tokens.css.
const COLOR = {
  origen: '22c55e',
  destino: '3b82f6',
  sos: 'ef4444',
  conductor: 'f59e0b',
};

const STYLE_URL = 'https://api.mapbox.com/styles/v1/mapbox/dark-v11/static';
const MAX_SIZE = 1280;
const km = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
const par = (p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;
const formatKm = (v) => `${km.format(v)} km`;

/** Codificación polyline de Google (precisión 5), la que espera el overlay `path` de Mapbox. */
function encodePolyline(points) {
  const out = [];
  let lastLat = 0;
  let lastLng = 0;
  const push = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      out.push(String.fromCharCode((0x20 | (v & 0x1f)) + 63));
      v >>>= 5;
    }
    out.push(String.fromCharCode(v + 63));
  };
  points.forEach((p) => {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    push(lat - lastLat);
    push(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  });
  return out.join('');
}

function buildStaticUrl({
  origen, destino, sos, conductor, token, ancho, alto,
}) {
  const puntos = [origen, destino, sos, conductor].filter(Boolean);
  if (!token || puntos.length === 0) return null;

  const overlays = [];
  if (origen && destino) {
    const trazo = encodePolyline([origen, destino]);
    overlays.push(`path-4+${COLOR.destino}-0.85(${encodeURIComponent(trazo)})`);
  }
  if (origen) overlays.push(`pin-s-a+${COLOR.origen}(${par(origen)})`);
  if (destino) overlays.push(`pin-s-b+${COLOR.destino}(${par(destino)})`);
  if (conductor) overlays.push(`pin-s+${COLOR.conductor}(${par(conductor)})`);
  // El SOS va al final para quedar dibujado encima del resto.
  if (sos) overlays.push(`pin-l+${COLOR.sos}(${par(sos)})`);

  // Mapbox admite hasta 1280 px por lado: se pide el doble del tamaño CSS mientras quepa
  // (pantallas HiDPI) manteniendo la proporción del contenedor.
  const w = Math.min(MAX_SIZE, Math.max(180, Math.round(ancho)));
  const h = Math.min(MAX_SIZE, Math.max(120, Math.round(alto)));
  const escala = Math.min(2, MAX_SIZE / w, MAX_SIZE / h);
  const tamano = escala >= 2 ? `${w}x${h}@2x` : `${Math.round(w * escala)}x${Math.round(h * escala)}`;
  const encuadre = puntos.length > 1 ? 'auto' : `${par(puntos[0])},13,0`;
  const padding = puntos.length > 1 ? 'padding=44&' : '';

  return `${STYLE_URL}/${overlays.join(',')}/${encuadre}/${tamano}?${padding}access_token=${token}`;
}

function resumen(info) {
  if (!info) return null;
  const partes = [];
  if (info.distanciaOrigenKm != null) partes.push(`SOS a ${formatKm(info.distanciaOrigenKm)} del origen`);
  if (info.distanciaDestinoKm != null) partes.push(`faltan ${formatKm(info.distanciaDestinoKm)} al destino`);
  if (partes.length === 0) return null;
  const texto = partes.join(' · ');
  return info.aproximado ? `${texto} (aprox.)` : texto;
}

function PuntoTexto({ nombre, punto, tono, conEnlace }) {
  return (
    <li className="routemap__coord">
      <span className={`routemap__dot routemap__dot--${tono}`} aria-hidden="true" />
      <span className="routemap__coord-name">{nombre}</span>
      {conEnlace && (
        <a
          className="routemap__coord-link"
          href={mapsUrl(punto.lat, punto.lng)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-mono">{punto.lat.toFixed(5)}, {punto.lng.toFixed(5)}</span>
          <ExternalLink size={12} />
        </a>
      )}
    </li>
  );
}

/**
 * Mapa estático del SOS: origen (A), destino (B), trayectoria y el punto donde se activó
 * la alerta. Degrada siempre a texto + enlaces a Google Maps si no hay token, no hay
 * coordenadas o la imagen no carga.
 */
export default function RouteMap({
  origen = null,
  destino = null,
  sos = null,
  conductor = null,
  info = null,
  alto = 260,
  compacto = false,
  titulo = null,
}) {
  const { token, cargando } = useMapboxToken();
  const contenedor = useRef(null);
  const [ancho, setAncho] = useState(0);
  const [falloImagen, setFalloImagen] = useState(false);
  const [cargada, setCargada] = useState(false);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return undefined;
    // Se redondea a pasos de 20 px para no rehacer la URL en cada píxel de resize.
    const medir = () => setAncho(Math.round(el.clientWidth / 20) * 20);
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const puntos = [origen, destino, sos, conductor].filter(Boolean);
  const url = useMemo(() => (ancho > 0
    ? buildStaticUrl({ origen, destino, sos, conductor, token, ancho, alto })
    : null), [origen, destino, sos, conductor, token, ancho, alto]);

  useEffect(() => {
    setFalloImagen(false);
    setCargada(false);
  }, [url]);

  const puedeMostrarMapa = !!url && !falloImagen;
  // Aún midiendo el contenedor o pidiendo el token: no se puede afirmar todavía que no haya mapa.
  const preparando = !puedeMostrarMapa && !falloImagen && puntos.length > 0 && (cargando || ancho === 0);

  let aviso = null;
  if (!puedeMostrarMapa && !preparando) {
    if (puntos.length === 0) aviso = 'Sin coordenadas del viaje ni de la alerta para dibujar el mapa.';
    else if (falloImagen) aviso = 'No se pudo cargar la imagen del mapa.';
    else aviso = 'Mapa no disponible en este momento.';
  }

  // La leyenda hace de referencia de colores y, cuando no hay mapa, de listado de coordenadas.
  const habraMapa = puedeMostrarMapa || preparando;
  const conEnlace = !compacto || !habraMapa;
  const nombreCorto = compacto && habraMapa;
  const leyenda = [
    origen && {
      tono: 'origen',
      punto: origen,
      nombre: nombreCorto ? 'A · Origen' : `A · Origen${origen.label ? `: ${origen.label}` : ''}`,
    },
    destino && {
      tono: 'destino',
      punto: destino,
      nombre: nombreCorto ? 'B · Destino' : `B · Destino${destino.label ? `: ${destino.label}` : ''}`,
    },
    sos && { tono: 'sos', punto: sos, nombre: nombreCorto ? 'SOS' : 'SOS activado aquí' },
    conductor && { tono: 'conductor', punto: conductor, nombre: 'Conductor' },
  ].filter(Boolean);

  const linea = resumen(info);
  const avance = info?.avanceRuta != null && Number.isFinite(info.avanceRuta)
    ? Math.min(100, Math.max(0, Math.round(info.avanceRuta * 100)))
    : null;

  return (
    <div className={`routemap${compacto ? ' routemap--compacto' : ''}`}>
      {titulo && <h4 className="section-title routemap__title">{titulo}</h4>}

      <div className="routemap__canvas" ref={contenedor} style={{ height: `${alto}px` }}>
        {(preparando || (puedeMostrarMapa && !cargada)) && (
          <div className="routemap__loading" aria-hidden="true" />
        )}
        {puedeMostrarMapa && (
          <img
            className={`routemap__img${cargada ? ' is-loaded' : ''}`}
            src={url}
            alt="Mapa con el origen, el destino y el punto del SOS"
            loading="lazy"
            // Si la imagen venía en caché el evento load puede no dispararse.
            ref={(el) => { if (el?.complete && el.naturalWidth > 0) setCargada(true); }}
            onLoad={() => setCargada(true)}
            onError={() => setFalloImagen(true)}
          />
        )}
        {aviso && (
          <div className="routemap__placeholder">
            <MapPinOff size={compacto ? 16 : 20} aria-hidden="true" />
            <span>{aviso}</span>
          </div>
        )}
      </div>

      {linea && <p className="routemap__summary">{linea}</p>}

      {avance != null && !compacto && (
        <div className="routemap__progress" title={`Avance de la ruta: ${avance}%`}>
          <div className="routemap__progress-bar">
            <span className="routemap__progress-fill" style={{ width: `${avance}%` }} />
          </div>
          <span className="routemap__progress-label">{avance}% de la ruta recorrido</span>
        </div>
      )}

      {leyenda.length > 0 && (
        <ul className={`routemap__coords${compacto ? ' routemap__coords--inline' : ''}`}>
          {leyenda.map((item) => (
            <PuntoTexto
              key={item.tono}
              nombre={item.nombre}
              punto={item.punto}
              tono={item.tono}
              conEnlace={conEnlace}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
