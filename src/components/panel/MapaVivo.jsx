import { useCallback, useMemo, useState } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getDrivers } from '../../api/admin';
import { getModeratorDrivers } from '../../api/moderator';
import useSondeo from '../../hooks/useSondeo';
import { errorMessage, toList } from '../../utils/format';
import { Button } from '../ui';
import TarjetaPersona from './TarjetaPersona';
import FiltroZona from './FiltroZona';
import Encuadre from './mapaBase';
import { POPAYAN, posicionDe } from './geo';

const REFRESCO_MS = 10000;

const ICONO_ON = L.divIcon({ className: '', html: '<div class="panel-pin panel-pin--on"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

/**
 * Conductores conectados con ubicación, en vivo (sondeo cada 10 s).
 * props: { area: 'admin'|'moderator', paramsExtra? } — paramsExtra: p. ej. ciudadParams del admin en el panel del moderador.
 */
export default function MapaVivo({ area, paramsExtra }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [zona, setZona] = useState('');
  const [actualizado, setActualizado] = useState(null);
  const extraKey = JSON.stringify(paramsExtra || {});

  const cargar = useCallback(async () => {
    try {
      const params = { online: 1, limit: 100, ...JSON.parse(extraKey) };
      const res = area === 'admin'
        ? await getDrivers({ ...params, zona: zona || undefined })
        : await getModeratorDrivers(params);
      setRows(toList(res.data, 'drivers'));
      setError('');
      setActualizado(new Date());
    } catch (e) {
      setError(errorMessage(e, 'No se pudo cargar el mapa'));
    }
  }, [area, zona, extraKey]);

  useSondeo(cargar, REFRESCO_MS);

  const visibles = useMemo(
    () => rows.map((d) => ({ d, pos: posicionDe(d.ultimaUbicacion) })).filter((x) => x.pos),
    [rows],
  );

  return (
    <div className="mapa-vivo">
      <div className="toolbar">
        <p className="mapa-vivo__count">
          {visibles.length} conectados
          {actualizado && <small className="text-muted"> · actualizado {actualizado.toLocaleTimeString('es-CO')}</small>}
        </p>
        {area === 'admin' && <FiltroZona value={zona} onChange={setZona} />}
      </div>
      {error && <div className="page-error" role="alert">{error} <Button size="sm" variant="secondary" onClick={cargar}>Reintentar</Button></div>}
      <div className="mapa-vivo__map panel-mapa">
        <MapContainer center={POPAYAN} zoom={12} scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="&copy; OpenStreetMap" />
          <Encuadre puntos={visibles.map((x) => x.pos)} />
          {visibles.map(({ d, pos }) => (
            <Marker key={d.id} position={pos} icon={ICONO_ON}>
              <Popup>
                <div className="stack">
                  <TarjetaPersona persona={d} tipo="conductor" area={area} />
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/${area}/drivers/${d.id}`)}>Ver perfil</Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
