import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import {
  ArrowLeft, Check, Crosshair, LocateFixed, Minus, Plus, Ruler, Target, Trash2, TriangleAlert,
} from 'lucide-react';
import { Button } from '../ui';
import 'leaflet/dist/leaflet.css';
import './OperationsMap.css';

// El backend acepta radios en kilómetros, mayores que cero y hasta 300 km
// (app/services/coverage_service.ts). Se respeta el mismo rango aquí.
const RADIO_MIN = 0.2;
const RADIO_MAX = 300;
const RADIO_POR_DEFECTO = 5;
const KM_POR_GRADO = 111.32;

// Centro aproximado de Colombia, para cuando no hay ninguna zona de referencia.
const VISTA_POR_DEFECTO = { lat: 4.5709, lng: -74.2973, zoom: 5 };

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const coord = (n) => Number(n).toFixed(5);
const clampRadio = (km) => Math.min(RADIO_MAX, Math.max(RADIO_MIN, km));
const redondear = (km) => Math.round(km * 100) / 100;

/** Zoom que deja el círculo completo a la vista. */
function zoomParaRadio(radioKm) {
  const tabla = [[1, 14], [3, 13], [7, 12], [15, 11], [30, 10], [60, 9], [120, 8]];
  const fila = tabla.find(([max]) => radioKm <= max);
  return fila ? fila[1] : 7;
}

/**
 * Punto del borde del círculo hacia el este. Se parte de la aproximación plana y
 * se corrige con la distancia real del mapa para que el tirador quede sobre el trazo.
 */
function puntoDelTirador(map, centro, radioKm) {
  const cos = Math.max(0.05, Math.cos((centro.lat * Math.PI) / 180));
  let delta = radioKm / (KM_POR_GRADO * cos);
  for (let i = 0; i < 3; i += 1) {
    const d = map.distance(centro, L.latLng(centro.lat, centro.lng + delta)) / 1000;
    if (!Number.isFinite(d) || d <= 0) break;
    delta *= radioKm / d;
  }
  return L.latLng(centro.lat, centro.lng + delta);
}

const iconoCentro = L.divIcon({
  className: 'opsmap__icon opsmap__icon--centro',
  html: '<span aria-hidden="true"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const iconoTirador = L.divIcon({
  className: 'opsmap__icon opsmap__icon--tirador',
  html: '<span aria-hidden="true"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const iconoUbicacion = L.divIcon({
  className: 'opsmap__icon opsmap__icon--ubicacion',
  html: '<span aria-hidden="true"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Clics sobre el mapa: colocan o mueven el centro de la zona. */
function ClicsDelMapa({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/**
 * Zona en edición: círculo + marcador de centro arrastrable + tirador de radio.
 * Mientras se arrastra se usa estado interno (no se avisa al padre en cada
 * movimiento) para que Leaflet no reposicione el marcador en plena maniobra.
 */
function ZonaEnEdicion({ centro, radio, onChange, onPreview }) {
  const map = useMap();
  const [arrastreCentro, setArrastreCentro] = useState(null);
  const [arrastreRadio, setArrastreRadio] = useState(null);

  const tirador = useMemo(() => puntoDelTirador(map, centro, radio), [map, centro, radio]);
  const centroVivo = arrastreCentro || centro;
  const radioVivo = arrastreRadio ?? radio;
  // Extremo del radio en vivo: mantiene la línea de distancia pegada al trazo.
  const bordeVivo = useMemo(() => puntoDelTirador(map, centroVivo, radioVivo), [map, centroVivo, radioVivo]);

  return (
    <>
      <Circle
        center={centroVivo}
        radius={radioVivo * 1000}
        pathOptions={{ className: 'opsmap__circulo', interactive: false }}
      />
      <Polyline
        positions={[centroVivo, bordeVivo]}
        pathOptions={{ className: 'opsmap__radio-linea', interactive: false }}
      />
      <Marker
        position={centro}
        draggable
        icon={iconoCentro}
        alt="Centro de la zona (arrástralo para moverla)"
        title="Centro de la zona (arrástralo para moverla)"
        eventHandlers={{
          drag: (e) => {
            const p = e.target.getLatLng();
            setArrastreCentro(p);
            onPreview({ centro: { lat: p.lat, lng: p.lng }, radio });
          },
          dragend: (e) => {
            const p = e.target.getLatLng();
            setArrastreCentro(null);
            onPreview(null);
            onChange({ centro: { lat: p.lat, lng: p.lng } });
          },
        }}
      />
      {!arrastreCentro && (
        <Marker
          position={tirador}
          draggable
          icon={iconoTirador}
          alt="Tirador del radio (arrástralo para ampliar o reducir)"
          title="Tirador del radio (arrástralo para ampliar o reducir)"
          eventHandlers={{
            drag: (e) => {
              const km = clampRadio(map.distance(centro, e.target.getLatLng()) / 1000);
              setArrastreRadio(km);
              onPreview({ centro, radio: km });
            },
            dragend: (e) => {
              const km = redondear(clampRadio(map.distance(centro, e.target.getLatLng()) / 1000));
              setArrastreRadio(null);
              onPreview(null);
              onChange({ radio: km });
            },
          }}
        >
          <Tooltip permanent direction="right" offset={[10, 0]} className="opsmap__etiqueta-radio">
            {numero.format(radioVivo)} km
          </Tooltip>
        </Marker>
      )}
    </>
  );
}

/** Zonas ya guardadas, dibujadas en gris para no solaparlas a ciegas. */
function ZonasDeReferencia({ zonas }) {
  return zonas.map((z, i) => {
    const clase = `opsmap__referencia${z.activa === false ? ' opsmap__referencia--pausada' : ''}`;
    const etiqueta = <Tooltip>{z.nombre || 'Zona sin nombre'}</Tooltip>;
    if (z.tipo === 'circulo') {
      return (
        <Circle key={`c-${i}`} center={[z.lat, z.lng]} radius={z.radio * 1000} pathOptions={{ className: clase }}>
          {etiqueta}
        </Circle>
      );
    }
    return (
      <Rectangle
        key={`r-${i}`}
        bounds={[[z.sur, z.oeste], [z.norte, z.este]]}
        pathOptions={{ className: clase }}
      >
        {etiqueta}
      </Rectangle>
    );
  });
}

/**
 * Mapa de operaciones a pantalla casi completa: permite marcar un centro y
 * dibujar el radio de la zona de forma visual. No guarda nada en el servidor;
 * devuelve la zona al editor con `onApply`.
 *
 * Con `readOnly` solo muestra el límite (para que un moderador vea su zona sin
 * poder cambiarla): sin clic en el mapa, sin tiradores, sin deslizador y sin
 * botones de crear, eliminar ni aplicar. Se conservan el zoom, el centrado y
 * los datos de la zona.
 */
export default function OperationsMap({
  zoneName = '',
  initialCircle = null,
  referenceRect = null,
  otherZones = [],
  readOnly = false,
  onClose,
  onApply,
}) {
  const mapRef = useRef(null);
  const erroresDeTiles = useRef(0);

  const [centro, setCentro] = useState(initialCircle ? { lat: initialCircle.lat, lng: initialCircle.lng } : null);
  const [radio, setRadio] = useState(initialCircle ? clampRadio(initialCircle.radio) : RADIO_POR_DEFECTO);
  const [radioTexto, setRadioTexto] = useState(String(initialCircle ? redondear(clampRadio(initialCircle.radio)) : RADIO_POR_DEFECTO));
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [miUbicacion, setMiUbicacion] = useState(null);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [tilesCaidos, setTilesCaidos] = useState(false);

  const vistaInicial = useMemo(() => {
    if (initialCircle) return { lat: initialCircle.lat, lng: initialCircle.lng, zoom: zoomParaRadio(clampRadio(initialCircle.radio)) };
    if (referenceRect) {
      return {
        lat: (referenceRect.norte + referenceRect.sur) / 2,
        lng: (referenceRect.este + referenceRect.oeste) / 2,
        zoom: 11,
      };
    }
    const otra = otherZones[0];
    if (otra) {
      if (otra.tipo === 'circulo') return { lat: otra.lat, lng: otra.lng, zoom: zoomParaRadio(otra.radio) };
      return { lat: (otra.norte + otra.sur) / 2, lng: (otra.este + otra.oeste) / 2, zoom: 10 };
    }
    return VISTA_POR_DEFECTO;
    // Solo importa el valor del primer render: después manda el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const centroMostrado = vistaPrevia?.centro || centro;
  const radioMostrado = vistaPrevia?.radio ?? radio;
  const area = Math.PI * radioMostrado * radioMostrado;

  const aplicarRadio = useCallback((km) => {
    const valor = redondear(clampRadio(km));
    setRadio(valor);
    setRadioTexto(String(valor));
  }, []);

  const onCambioDeZona = useCallback((patch) => {
    if (patch.centro) setCentro(patch.centro);
    if (patch.radio !== undefined) aplicarRadio(patch.radio);
  }, [aplicarRadio]);

  const colocarCentro = useCallback((punto) => setCentro(punto), []);

  const crearRadio = useCallback(() => {
    const map = mapRef.current;
    const c = map ? map.getCenter() : { lat: vistaInicial.lat, lng: vistaInicial.lng };
    setCentro({ lat: c.lat, lng: c.lng });
    aplicarRadio(radio || RADIO_POR_DEFECTO);
  }, [aplicarRadio, radio, vistaInicial]);

  const eliminarRadio = useCallback(() => {
    setCentro(null);
    setVistaPrevia(null);
  }, []);

  const centrarEnLaZona = useCallback(() => {
    if (!centro) return;
    mapRef.current?.flyTo([centro.lat, centro.lng], zoomParaRadio(radio), { duration: 0.6 });
  }, [centro, radio]);

  const centrarEnMiUbicacion = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorUbicacion('Este navegador no permite obtener tu ubicación.');
      return;
    }
    setBuscandoUbicacion(true);
    setErrorUbicacion('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscandoUbicacion(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMiUbicacion(p);
        mapRef.current?.flyTo([p.lat, p.lng], 13, { duration: 0.6 });
      },
      (err) => {
        setBuscandoUbicacion(false);
        if (err?.code === 1) setErrorUbicacion('Permiso de ubicación denegado. Actívalo en el navegador o marca el centro con un clic.');
        else if (err?.code === 3) setErrorUbicacion('Se agotó el tiempo al buscar tu ubicación. Intenta de nuevo.');
        else setErrorUbicacion('No se pudo obtener tu ubicación.');
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const guardar = useCallback(() => {
    if (!centro) return;
    onApply?.({ lat: centro.lat, lng: centro.lng, radio: redondear(clampRadio(radio)) });
  }, [centro, onApply, radio]);

  // Mientras el mapa está abierto no se desplaza la página de fondo.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, []);

  const onErrorDeTiles = useCallback(() => {
    erroresDeTiles.current += 1;
    if (erroresDeTiles.current >= 4) setTilesCaidos(true);
  }, []);

  return (
    <div className="opsmap">
      <header className="opsmap__bar">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onClose} aria-label="Volver al editor de zonas">
          Volver
        </Button>
        <div className="opsmap__titulo">
          <h2>{zoneName ? `Zona: ${zoneName}` : (readOnly ? 'Zona de operación' : 'Nueva zona de operación')}</h2>
          <p>
            {readOnly
              ? 'Límite de la zona donde operas. Solo el administrador puede modificarlo.'
              : 'Haz clic en el mapa para colocar el centro y arrastra el tirador para ajustar el radio.'}
          </p>
        </div>
        {!readOnly && (
          <Button icon={<Check size={16} />} onClick={guardar} disabled={!centro} aria-label="Aplicar la zona al editor">
            Aplicar zona
          </Button>
        )}
      </header>

      <div className="opsmap__cuerpo">
        <div className="opsmap__lienzo">
          <MapContainer
            ref={mapRef}
            className="opsmap__mapa"
            center={[vistaInicial.lat, vistaInicial.lng]}
            zoom={vistaInicial.zoom}
            zoomControl={false}
            attributionControl={false}
            worldCopyJump
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              eventHandlers={{ tileerror: onErrorDeTiles }}
            />
            {!readOnly && <ClicsDelMapa onPick={colocarCentro} />}
            <ZonasDeReferencia zonas={otherZones} />
            {(readOnly || !centro) && referenceRect && (
              <Rectangle
                bounds={[[referenceRect.sur, referenceRect.oeste], [referenceRect.norte, referenceRect.este]]}
                pathOptions={{ className: 'opsmap__rect-actual' }}
              />
            )}
            {centro && (readOnly ? (
              <Circle
                center={centro}
                radius={radio * 1000}
                pathOptions={{ className: 'opsmap__circulo', interactive: false }}
              />
            ) : (
              <ZonaEnEdicion centro={centro} radio={radio} onChange={onCambioDeZona} onPreview={setVistaPrevia} />
            ))}
            {miUbicacion && <Marker position={[miUbicacion.lat, miUbicacion.lng]} icon={iconoUbicacion} alt="Mi ubicación" />}
          </MapContainer>

          <div className="opsmap__zoom">
            <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Acercar el mapa">
              <Plus size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Alejar el mapa">
              <Minus size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={centrarEnLaZona} disabled={!centro} aria-label="Centrar el mapa en la zona">
              <Target size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={centrarEnMiUbicacion}
              disabled={buscandoUbicacion}
              aria-label="Centrar el mapa en mi ubicación"
            >
              <LocateFixed size={16} aria-hidden="true" />
            </button>
          </div>

          <p className="opsmap__credito">
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
          </p>

          {tilesCaidos && (
            <p className="opsmap__aviso-tiles" role="status">
              <TriangleAlert size={14} aria-hidden="true" />
              Sin conexión con el servidor de mapas. Puedes seguir ajustando el radio con los controles.
            </p>
          )}
        </div>

        <aside className="opsmap__panel" aria-label="Información y controles de la zona">
          <section className="opsmap__seccion">
            <h3 className="opsmap__seccion-titulo">Zona seleccionada</h3>
            {centroMostrado ? (
              <dl className="opsmap__datos">
                <div>
                  <dt>Centro (lat, lng)</dt>
                  <dd className="text-mono">{coord(centroMostrado.lat)}, {coord(centroMostrado.lng)}</dd>
                </div>
                <div>
                  <dt>Radio</dt>
                  <dd className="text-mono">{numero.format(radioMostrado)} km</dd>
                </div>
                <div>
                  <dt>Diámetro (distancia cubierta)</dt>
                  <dd className="text-mono">{numero.format(radioMostrado * 2)} km</dd>
                </div>
                <div>
                  <dt>Área aproximada</dt>
                  <dd className="text-mono">{numero.format(area)} km²</dd>
                </div>
              </dl>
            ) : (
              <p className="opsmap__vacio">
                <Ruler size={16} aria-hidden="true" />
                {readOnly
                  ? 'Esta zona está definida por un rectángulo; el mapa lo dibuja con línea discontinua.'
                  : 'Todavía no hay radio. Usa «Crear radio» o haz clic en el mapa sobre el centro de la ciudad.'}
              </p>
            )}
          </section>

          {!readOnly && (
          <section className="opsmap__seccion">
            <h3 className="opsmap__seccion-titulo">Radio de cobertura</h3>
            <div className="opsmap__radio">
              <input
                type="range"
                min={RADIO_MIN}
                max={100}
                step={0.1}
                value={Math.min(100, radio)}
                onChange={(e) => aplicarRadio(Number(e.target.value))}
                disabled={!centro}
                aria-label="Radio de la zona en kilómetros"
              />
              <label className="opsmap__radio-campo">
                <span>km</span>
                <input
                  type="number"
                  min={RADIO_MIN}
                  max={RADIO_MAX}
                  step={0.1}
                  value={radioTexto}
                  disabled={!centro}
                  onChange={(e) => {
                    setRadioTexto(e.target.value);
                    const n = Number(String(e.target.value).replace(',', '.'));
                    if (Number.isFinite(n) && n >= RADIO_MIN && n <= RADIO_MAX) setRadio(n);
                  }}
                  onBlur={() => setRadioTexto(String(redondear(radio)))}
                  aria-label="Radio en kilómetros"
                />
              </label>
            </div>
            <p className="opsmap__ayuda">Entre {RADIO_MIN} y {RADIO_MAX} km. El deslizador llega a 100 km; para más, escribe el valor.</p>
          </section>
          )}

          {!readOnly && (
          <section className="opsmap__seccion">
            <h3 className="opsmap__seccion-titulo">Acciones</h3>
            <div className="opsmap__acciones">
              <Button variant="secondary" icon={<Plus size={15} />} onClick={crearRadio} disabled={!!centro} fullWidth>
                Crear radio
              </Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={eliminarRadio} disabled={!centro} fullWidth>
                Eliminar radio
              </Button>
              <Button
                variant="ghost"
                icon={<Crosshair size={15} />}
                onClick={centrarEnMiUbicacion}
                loading={buscandoUbicacion}
                fullWidth
              >
                Centrar en mi ubicación
              </Button>
            </div>
            {errorUbicacion && <p className="opsmap__error" role="status">{errorUbicacion}</p>}
            {!centro && referenceRect && (
              <p className="opsmap__ayuda">
                Esta zona está guardada como rectángulo (se dibuja con línea discontinua). Al crear un radio pasará a ser
                una zona circular.
              </p>
            )}
          </section>
          )}

          {readOnly && (
            <section className="opsmap__seccion">
              <Button
                variant="ghost"
                icon={<Crosshair size={15} />}
                onClick={centrarEnMiUbicacion}
                loading={buscandoUbicacion}
                fullWidth
              >
                Centrar en mi ubicación
              </Button>
              {errorUbicacion && <p className="opsmap__error" role="status">{errorUbicacion}</p>}
              <p className="opsmap__ayuda">
                Solo se aceptan viajes que empiecen dentro de este límite. Si necesitas cambiarlo, pídeselo al
                administrador.
              </p>
            </section>
          )}

          {otherZones.length > 0 && (
            <section className="opsmap__seccion">
              <h3 className="opsmap__seccion-titulo">Otras zonas ({otherZones.length})</h3>
              <ul className="opsmap__lista">
                {otherZones.map((z, i) => (
                  <li key={`${z.nombre}-${i}`}>
                    <span className="truncate">{z.nombre || 'Sin nombre'}</span>
                    <span className="text-mono text-muted">
                      {z.tipo === 'circulo' ? `${numero.format(z.radio)} km` : 'rectángulo'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
