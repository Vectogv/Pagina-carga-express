import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { iconoVehiculo, rumboEntre, setRumbo } from './VehiculoMarcador';

const pin = (clase, texto) => L.divIcon({
  className: '',
  html: `<span class="cli-pin-mapa ${clase}">${texto}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const ICONO = {
  origen: pin('cli-pin-mapa--origen', 'A'),
  destino: pin('cli-pin-mapa--destino', 'B'),
};

const valido = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && (Number(p.lat) || Number(p.lng));
const punto = (p) => [Number(p.lat), Number(p.lng)];

/** Encuadra el mapa cuando cambian los puntos clave (no en cada movimiento del conductor). */
function Encuadre({ puntos, clave }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 1) map.setView(puntos[0], 15);
    else if (puntos.length > 1) map.fitBounds(puntos, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, clave]);
  return null;
}

/** Mapa del viaje activo: origen, destino, conductor en vivo y la ruta que sigue. */
export default function MapaViaje({ viaje, conductor, ruta }) {
  const icono = useMemo(() => iconoVehiculo(viaje.conductor?.tipoVehiculo), [viaje.conductor?.tipoVehiculo]);
  const marcador = useRef(null);
  const previa = useRef(null);
  const [rumbo, setRumboState] = useState(0);
  const lat = Number(conductor?.lat);
  const lng = Number(conductor?.lng);
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const nueva = { lat, lng };
    const r = previa.current ? rumboEntre(previa.current, nueva) : null;
    if (r != null) setRumboState(r);
    previa.current = nueva;
  }, [lat, lng]);
  // El ícono se recrea al cambiar el tipo: se vuelve a girar.
  useEffect(() => { setRumbo(marcador.current, rumbo); }, [rumbo, icono, lat, lng]);
  const puntos = [viaje.origen, viaje.destino, conductor].filter(valido).map(punto);
  if (puntos.length === 0) return null;
  const clave = `${viaje.id}-${viaje.estado}-${valido(conductor) ? 1 : 0}`;

  return (
    <div className="cli-mapa">
      <MapContainer center={puntos[0]} zoom={13} scrollWheelZoom={false} zoomControl attributionControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        {ruta?.length > 1 && <Polyline positions={ruta} pathOptions={{ color: '#1656d6', weight: 5, opacity: 0.85 }} />}
        {valido(viaje.origen) && <Marker position={punto(viaje.origen)} icon={ICONO.origen} />}
        {valido(viaje.destino) && <Marker position={punto(viaje.destino)} icon={ICONO.destino} />}
        {valido(conductor) && <Marker ref={marcador} position={punto(conductor)} icon={icono} zIndexOffset={1000} />}
        <Encuadre puntos={puntos} clave={clave} />
      </MapContainer>
    </div>
  );
}
