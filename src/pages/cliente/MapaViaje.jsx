import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const pin = (clase, texto) => L.divIcon({
  className: '',
  html: `<span class="cli-pin-mapa ${clase}">${texto}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const ICONO = {
  origen: pin('cli-pin-mapa--origen', 'A'),
  destino: pin('cli-pin-mapa--destino', 'B'),
  conductor: L.divIcon({
    className: '',
    html: '<span class="cli-pin-mapa cli-pin-mapa--conductor"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></span>',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  }),
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
  const puntos = [viaje.origen, viaje.destino, conductor].filter(valido).map(punto);
  if (puntos.length === 0) return null;
  const clave = `${viaje.id}-${viaje.estado}-${valido(conductor) ? 1 : 0}`;

  return (
    <div className="cli-mapa">
      <MapContainer center={puntos[0]} zoom={13} scrollWheelZoom={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        {ruta?.length > 1 && <Polyline positions={ruta} pathOptions={{ color: '#1656d6', weight: 5, opacity: 0.85 }} />}
        {valido(viaje.origen) && <Marker position={punto(viaje.origen)} icon={ICONO.origen} />}
        {valido(viaje.destino) && <Marker position={punto(viaje.destino)} icon={ICONO.destino} />}
        {valido(conductor) && <Marker position={punto(conductor)} icon={ICONO.conductor} zIndexOffset={1000} />}
        <Encuadre puntos={puntos} clave={clave} />
      </MapContainer>
    </div>
  );
}
