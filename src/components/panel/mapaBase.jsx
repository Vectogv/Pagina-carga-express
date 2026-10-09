import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { POPAYAN } from './geo';

/** Reencuadra solo cuando cambia el conjunto de puntos, no en cada refresco. */
export default function Encuadre({ puntos }) {
  const map = useMap();
  const clave = puntos.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (!puntos.length) map.setView(POPAYAN, 12);
    else if (puntos.length === 1) map.setView(puntos[0], 14);
    else map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, map]);
  return null;
}
