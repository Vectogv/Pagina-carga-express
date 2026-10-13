import MapaRecorrido from './MapaRecorrido';
import MapaPuntos from './MapaPuntos';
import { puntosDeEmergencia } from './geo';

/**
 * Mapa de un caso SOS (OpenStreetMap, sin Mapbox).
 * - Con viaje: MapaRecorrido en modo "sos" (A, B, "!" donde se activó, rojo A→SOS, azul SOS→B).
 * - Sin viaje (p. ej. cliente sin servicio activo): solo los puntos que trae la alerta.
 * props: { area: 'admin'|'moderator', emergencia, viaje?: detalle del viaje si ya se cargó, alturaPx? }
 */
export default function MapaEmergencia({ area, emergencia, viaje, alturaPx = 280 }) {
  const p = puntosDeEmergencia(emergencia, viaje);
  if (!p) return null;
  if (p.viajeId) {
    return <MapaRecorrido key={p.viajeId} area={area} viajeId={p.viajeId} alturaPx={alturaPx} modo="sos" marcaSos={p.sos} />;
  }
  return <MapaPuntos sos={p.sos} conductor={p.conductor} origen={p.origen} destino={p.destino} alturaPx={alturaPx} />;
}
