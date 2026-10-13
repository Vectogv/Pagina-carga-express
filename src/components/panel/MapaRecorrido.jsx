import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getTripRecorrido as recorridoAdmin } from '../../api/admin';
import { getTripRecorrido as recorridoModerador } from '../../api/moderator';
import { errorMessage, formatDateTime } from '../../utils/format';
import { Button, EmptyState, LoadingState } from '../ui';
import Encuadre from './mapaBase';
import { distanciaM, posicionDe, tramosDe } from './geo';
import { PINES } from './pines';

const REFRESCO_MS = 10000;
const AZUL = '#3B82F6';
const ROJO = '#EF4444';


/** "850 m" o "1,2 km" para la distancia del cierre al destino. */
function textoDistancia(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;
}

/**
 * Mapa de un viaje (OpenStreetMap, sin Mapbox) desde GET /api/{admin|moderator}/trips/:id/recorrido.
 * props: { area: 'admin'|'moderator', viajeId, alturaPx?, modo?: 'viaje'|'sos'|'disputa', marcaSos?: {lat,lng,at,id?} }
 * - viaje (por defecto): A, B, recorrido real (rojo), planeada (azul) y el conductor si está activo.
 *   El "!" solo si `marcaSos` viene (el viaje tuvo SOS), rotulado "SOS (alerta #N)".
 * - sos: A, B y el "!" donde se activó; rojo = A→SOS (recorrido), azul = SOS→B (pendiente).
 *   Sin puntos GPS se aproxima cortando la ruta planeada en el punto más cercano al SOS.
 * - disputa: A, B, rojo = real, azul = planeada y una bandera en el punto de cierre
 *   (`data.cierre` si el servidor lo manda; si no, el último punto registrado) con la
 *   distancia al destino. Sin marca de SOS.
 * Si el viaje está activo se refresca cada 10 s; si no, carga una sola vez.
 */
export default function MapaRecorrido({ area, viajeId, alturaPx, modo = 'viaje', marcaSos }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const fn = area === 'admin' ? recorridoAdmin : recorridoModerador;
      const res = await fn(viajeId);
      setData(res.data);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cargar el recorrido'));
    } finally {
      setCargando(false);
    }
  }, [area, viajeId]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);
  const activo = data?.activo === true;
  useEffect(() => {
    if (!activo) return undefined;
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, REFRESCO_MS);
    return () => clearInterval(id);
  }, [activo, cargar]);

  if (cargando && !data) return <LoadingState message="Cargando recorrido..." />;
  if (error && !data) {
    return <div className="page-error" role="alert">{error} <Button size="sm" variant="secondary" onClick={cargar}>Reintentar</Button></div>;
  }

  const origen = posicionDe(data?.origen);
  const destino = posicionDe(data?.destino);
  const planeada = (data?.planeada?.coords || []).map(posicionDe).filter(Boolean);
  const real = (data?.recorrido || []).map(posicionDe).filter(Boolean);
  const ultimo = posicionDe(data?.ultimoPunto);
  const conductor = modo === 'viaje' && activo ? posicionDe(data?.conductorUbicacion) : null;
  const sos = modo === 'disputa' ? null : posicionDe(marcaSos);

  // Punto de cierre de la disputa: lo que mande el servidor (`cierre`) o el último punto GPS.
  const cierreServidor = modo === 'disputa' ? posicionDe(data?.cierre) : null;
  const cierre = cierreServidor || (modo === 'disputa' ? ultimo : null);
  const cierreAt = cierreServidor ? data.cierre?.at : data?.ultimoPunto?.at;
  const distCierre = cierre && destino ? distanciaM(cierre, destino) : null;

  // En SOS se corta en la alerta; en viaje activo sin GPS, en el conductor; en disputa no se corta.
  const corte = modo === 'sos' ? sos : (modo === 'viaje' ? conductor : null);
  const { rojo, azul, aproximado } = tramosDe({ planeada, real, corte });
  // El encuadre prioriza A, B y las marcas; las rutas van entre ellos.
  const puntos = [origen, destino, sos, cierre, conductor, ultimo, ...rojo, ...azul].filter(Boolean);

  if (!puntos.length) return <EmptyState title="Sin recorrido" description="Este viaje no tiene puntos de ubicación todavía." />;

  const estilo = alturaPx ? { height: alturaPx } : undefined;
  const etiquetaSos = modo === 'viaje' && marcaSos?.id != null ? `SOS (alerta #${marcaSos.id})` : 'SOS';
  const etiquetaCierre = cierreServidor ? 'Cierre' : 'Último punto registrado';
  const mostrarUltimo = modo === 'viaje' && ultimo && !conductor;

  return (
    <div className="mapa-recorrido">
      {error && <div className="page-error" role="alert">{error}</div>}
      <div className="panel-mapa" style={estilo}>
        <MapContainer center={puntos[0]} zoom={13} scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="&copy; OpenStreetMap" />
          <Encuadre puntos={puntos} />
          {azul.length > 1 && <Polyline positions={azul} pathOptions={{ color: AZUL, weight: 4, opacity: 0.75 }} />}
          {rojo.length > 1 && <Polyline positions={rojo} pathOptions={{ color: ROJO, weight: 4, dashArray: aproximado ? '8 6' : undefined }} />}
          {origen && <Marker position={origen} icon={PINES.A} zIndexOffset={200}><Popup>Origen{data.origen?.direccion ? ` · ${data.origen.direccion}` : ''}</Popup></Marker>}
          {destino && <Marker position={destino} icon={PINES.B} zIndexOffset={200}><Popup>Destino{data.destino?.direccion ? ` · ${data.destino.direccion}` : ''}</Popup></Marker>}
          {mostrarUltimo && <Marker position={ultimo} icon={PINES.ultimo}><Popup>Último punto · {formatDateTime(data.ultimoPunto.at)}</Popup></Marker>}
          {conductor && <Marker position={conductor} icon={PINES.conductor} zIndexOffset={300}><Popup>Conductor ahora · {formatDateTime(data.conductorUbicacion.actualizadaEn)}</Popup></Marker>}
          {cierre && (
            <Marker position={cierre} icon={PINES.cierre} zIndexOffset={400}>
              <Popup>
                {etiquetaCierre}{cierreAt ? ` · ${formatDateTime(cierreAt)}` : ''}
                {distCierre != null ? ` · a ${textoDistancia(distCierre)} del destino` : ''}
              </Popup>
            </Marker>
          )}
          {sos && <Marker position={sos} icon={PINES.sos} zIndexOffset={400}><Popup>{etiquetaSos}{marcaSos?.at ? ` · ${formatDateTime(marcaSos.at)}` : ''}</Popup></Marker>}
        </MapContainer>
      </div>
      <div className="mapa-leyenda text-xs text-muted">
        <span><i className="mapa-leyenda__linea" style={{ background: ROJO }} /> Recorrido</span>
        <span><i className="mapa-leyenda__linea" style={{ background: AZUL }} /> {modo === 'sos' ? 'Ruta pendiente' : 'Ruta planeada'}</span>
        {sos && <span><i className="panel-pin panel-pin--sos mapa-leyenda__pin">!</i> {etiquetaSos}</span>}
        {cierre && <span><i className="panel-pin panel-pin--cierre mapa-leyenda__pin">⚑</i> {etiquetaCierre}</span>}
        {mostrarUltimo && <span><i className="panel-pin panel-pin--ultimo mapa-leyenda__pin" /> Último punto</span>}
        {conductor && <span><i className="panel-pin panel-pin--vehiculo mapa-leyenda__pin">🚚</i> Conductor ahora</span>}
        {activo && <span className="text-success">· En vivo</span>}
      </div>
      {modo === 'disputa' && (
        <p className="mapa-recorrido__nota text-sm text-strong">
          {distCierre != null
            ? `Cerró a ${textoDistancia(distCierre)} del destino${cierreServidor ? '' : ' (según el último punto GPS registrado)'}.`
            : 'Sin punto de cierre registrado: el viaje no tiene puntos GPS.'}
        </p>
      )}
      {aproximado && (
        <p className="mapa-recorrido__nota text-xs text-muted">Recorrido aproximado sobre la ruta planeada (el GPS no registró puntos).</p>
      )}
      {!aproximado && real.length === 0 && modo !== 'disputa' && (
        <p className="mapa-recorrido__nota text-xs text-muted">
          Sin recorrido registrado{activo ? ' todavía: aparece cuando el conductor empiece a moverse.' : '.'}
        </p>
      )}
    </div>
  );
}
