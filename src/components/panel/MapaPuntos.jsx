import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDateTime } from '../../utils/format';
import { EmptyState } from '../ui';
import Encuadre from './mapaBase';
import { posicionDe } from './geo';
import { PINES } from './pines';

/**
 * Mapa simple de puntos (OpenStreetMap) para un SOS sin viaje asociado: el "!" donde se
 * activó, el conductor si se sabe dónde está, y A/B si la alerta trae las coordenadas.
 * props: { sos?: {lat,lng,at?}, conductor?: {lat,lng}, origen?, destino?, alturaPx? }
 */
export default function MapaPuntos({ sos, conductor, origen, destino, alturaPx }) {
  const pSos = posicionDe(sos);
  const pConductor = posicionDe(conductor);
  const pOrigen = posicionDe(origen);
  const pDestino = posicionDe(destino);
  const puntos = [pOrigen, pDestino, pSos, pConductor].filter(Boolean);
  if (!puntos.length) return <EmptyState title="Sin ubicación" description="La alerta no trae coordenadas." />;

  const estilo = alturaPx ? { height: alturaPx } : undefined;
  return (
    <div className="mapa-recorrido">
      <div className="panel-mapa" style={estilo}>
        <MapContainer center={puntos[0]} zoom={15} scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="&copy; OpenStreetMap" />
          <Encuadre puntos={puntos} />
          {pOrigen && <Marker position={pOrigen} icon={PINES.A} zIndexOffset={200}><Popup>Origen</Popup></Marker>}
          {pDestino && <Marker position={pDestino} icon={PINES.B} zIndexOffset={200}><Popup>Destino</Popup></Marker>}
          {pConductor && <Marker position={pConductor} icon={PINES.conductor} zIndexOffset={300}><Popup>Conductor</Popup></Marker>}
          {pSos && <Marker position={pSos} icon={PINES.sos} zIndexOffset={400}><Popup>SOS{sos?.at ? ` · ${formatDateTime(sos.at)}` : ''}</Popup></Marker>}
        </MapContainer>
      </div>
      <div className="mapa-leyenda text-xs text-muted">
        {pSos && <span><i className="panel-pin panel-pin--sos mapa-leyenda__pin">!</i> SOS</span>}
        {pConductor && <span><i className="panel-pin panel-pin--vehiculo mapa-leyenda__pin">🚚</i> Conductor</span>}
        <span>Sin viaje asociado: no hay ruta que mostrar.</span>
      </div>
    </div>
  );
}
