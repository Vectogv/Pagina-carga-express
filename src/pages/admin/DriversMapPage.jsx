import { useCallback, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getDrivers, getAllPages } from '../../api/admin';
import { errorMessage } from '../../utils/format';
import { Button, PageHeader, Select } from '../../components/ui';
import { ciudadLabel, driverName } from './drivers/driverUtils';
import './DriversMapPage.css';

const POPAYAN = [2.4448, -76.6147];
const REFRESCO_MS = 30000;

const icono = (on) => L.divIcon({
  className: '',
  html: `<div class="dmap__pin dmap__pin--${on ? 'on' : 'off'}"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const ICONOS = { true: icono(true), false: icono(false) };

// Ubicación válida: números finitos dentro de rango (y no 0,0).
function posicion(d) {
  const lat = Number(d?.ultimaUbicacion?.lat);
  const lng = Number(d?.ultimaUbicacion?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return [lat, lng];
}

function Encuadre({ puntos }) {
  const map = useMap();
  // Solo reencuadra cuando cambia el conjunto de puntos visibles, no en cada refresco.
  const clave = puntos.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!puntos.length) map.setView(POPAYAN, 12);
    else if (puntos.length === 1) map.setView(puntos[0], 14);
    else map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, map]);
  return null;
}

export default function DriversMapPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [soloOn, setSoloOn] = useState(false);
  const [ciudad, setCiudad] = useState('');
  const [actualizado, setActualizado] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const { rows: r } = await getAllPages(getDrivers);
      setRows(r);
      setError('');
      setActualizado(new Date());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const conUbicacion = useMemo(
    () => rows.map((d) => ({ d, pos: posicion(d) })).filter((x) => x.pos),
    [rows],
  );
  const ciudades = useMemo(
    () => [...new Set(conUbicacion.map((x) => String(x.d.ciudad || '').toLowerCase()).filter(Boolean))].sort(),
    [conUbicacion],
  );
  const visibles = conUbicacion.filter((x) => (!soloOn || x.d.online)
    && (!ciudad || String(x.d.ciudad || '').toLowerCase() === ciudad));
  const conectados = conUbicacion.filter((x) => x.d.online).length;

  return (
    <div className="page dmap">
      <PageHeader
        title="Mapa de conductores"
        description="Última ubicación conocida de cada conductor. Se actualiza cada 30 segundos."
        actions={(
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={cargar} disabled={loading}>
            Actualizar
          </Button>
        )}
      />
      <div className="toolbar">
        <p className="dmap__count">
          {conUbicacion.length} conductores con ubicación · {conectados} conectados
          {actualizado && <small> · {actualizado.toLocaleTimeString('es-CO')}</small>}
        </p>
        <label className="dmap__check">
          <input type="checkbox" checked={soloOn} onChange={(e) => setSoloOn(e.target.checked)} /> Solo conectados
        </label>
        <Select className="inline-select" value={ciudad} onChange={(e) => setCiudad(e.target.value)} aria-label="Filtrar por ciudad">
          <option value="">Todas las ciudades</option>
          {ciudades.map((c) => <option key={c} value={c}>{ciudadLabel(c)}</option>)}
        </Select>
      </div>
      {error && <div className="page-error" role="alert">{error}</div>}
      <div className="dmap__map">
        <MapContainer center={POPAYAN} zoom={12} scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="&copy; OpenStreetMap" />
          <Encuadre puntos={visibles.map((x) => x.pos)} />
          {visibles.map(({ d, pos }) => (
            <Marker key={d.id} position={pos} icon={ICONOS[!!d.online]}>
              <Tooltip direction="top" offset={[0, -8]}>
                <strong>{driverName(d)}</strong><br />
                Placa: {d.placa || '—'}<br />
                Vehículo: {d.tipoVehiculo || '—'}<br />
                Ciudad: {ciudadLabel(d.ciudad)}<br />
                {d.online ? 'Conectado' : 'Desconectado'}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
