import { useCallback, useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getTripRecorrido as recorridoAdmin } from '../../api/admin';
import { getTripRecorrido as recorridoModerador } from '../../api/moderator';
import { errorMessage, formatDateTime } from '../../utils/format';
import { Button, EmptyState, LoadingState } from '../ui';
import Encuadre from './mapaBase';
import { posicionDe } from './geo';

const REFRESCO_MS = 10000;

const letra = (t, clase) => L.divIcon({ className: '', html: `<div class="panel-pin panel-pin--letra ${clase}">${t}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
const ICONOS = {
  A: letra('A', 'panel-pin--on'),
  B: letra('B', 'panel-pin--fin'),
  ultimo: L.divIcon({ className: '', html: '<div class="panel-pin panel-pin--ultimo"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
  conductor: L.divIcon({ className: '', html: '<div class="panel-pin panel-pin--vehiculo">🚚</div>', iconSize: [30, 30], iconAnchor: [15, 15] }),
  sos: L.divIcon({ className: '', html: '<div class="panel-pin panel-pin--sos">!</div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
};

/**
 * Ruta planeada (azul) y recorrido real (rojo) de un viaje.
 * props: { area: 'admin'|'moderator', viajeId, alturaPx?, marcaSos?: {lat,lng,at} }
 * Si el viaje está activo se refresca cada 10 s; si no, carga una sola vez.
 */
export default function MapaRecorrido({ area, viajeId, alturaPx, marcaSos }) {
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
  const conductor = posicionDe(data?.conductorUbicacion);
  const sos = posicionDe(marcaSos);
  const puntos = [origen, destino, ...planeada, ...real, ultimo, conductor, sos].filter(Boolean);

  if (!puntos.length) return <EmptyState title="Sin recorrido" description="Este viaje no tiene puntos de ubicación todavía." />;

  const estilo = alturaPx ? { height: alturaPx } : undefined;
  return (
    <div className="mapa-recorrido">
      {error && <div className="page-error" role="alert">{error}</div>}
      <div className="panel-mapa" style={estilo}>
        <MapContainer center={puntos[0]} zoom={13} scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="&copy; OpenStreetMap" />
          <Encuadre puntos={puntos} />
          {planeada.length > 1 && <Polyline positions={planeada} pathOptions={{ color: '#3B82F6', weight: 4, opacity: 0.7 }} />}
          {real.length > 1 && <Polyline positions={real} pathOptions={{ color: '#EF4444', weight: 4 }} />}
          {origen && <Marker position={origen} icon={ICONOS.A}><Popup>Origen{data.origen?.direccion ? ` · ${data.origen.direccion}` : ''}</Popup></Marker>}
          {destino && <Marker position={destino} icon={ICONOS.B}><Popup>Destino{data.destino?.direccion ? ` · ${data.destino.direccion}` : ''}</Popup></Marker>}
          {ultimo && <Marker position={ultimo} icon={ICONOS.ultimo}><Popup>Último punto · {formatDateTime(data.ultimoPunto.at)}</Popup></Marker>}
          {conductor && <Marker position={conductor} icon={ICONOS.conductor}><Popup>Conductor ahora · {formatDateTime(data.conductorUbicacion.actualizadaEn)}</Popup></Marker>}
          {sos && <Marker position={sos} icon={ICONOS.sos}><Popup>SOS · {formatDateTime(marcaSos.at)}</Popup></Marker>}
        </MapContainer>
      </div>
      <div className="mapa-leyenda text-xs text-muted">
        <span><i className="mapa-leyenda__linea" style={{ background: '#3B82F6' }} /> Planeada</span>
        <span><i className="mapa-leyenda__linea" style={{ background: '#EF4444' }} /> Recorrido real</span>
        <span><i className="panel-pin panel-pin--ultimo mapa-leyenda__pin" /> Último punto</span>
        {activo && <span className="text-success">· En vivo</span>}
      </div>
    </div>
  );
}
