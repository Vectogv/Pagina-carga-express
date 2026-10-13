import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { POPAYAN } from './geo';

const PADDING = [48, 48];

/**
 * Reencuadra solo cuando cambia el conjunto de puntos, no en cada refresco.
 * Se hace después de un frame y con invalidateSize(): dentro de un modal o una
 * pestaña el contenedor aún no tiene su tamaño final cuando monta el mapa, y
 * sin esto el encuadre deja puntos (p. ej. "Último punto") cortados en la esquina.
 */
export default function Encuadre({ puntos }) {
  const map = useMap();
  const clave = puntos.map((p) => p.join(',')).join('|');
  useEffect(() => {
    const encuadrar = () => {
      map.invalidateSize();
      if (!puntos.length) map.setView(POPAYAN, 12);
      else if (puntos.length === 1) map.setView(puntos[0], 15);
      else map.fitBounds(L.latLngBounds(puntos), { padding: PADDING, maxZoom: 17 });
    };
    encuadrar();
    const raf = requestAnimationFrame(encuadrar);
    const tardio = setTimeout(encuadrar, 350);
    return () => { cancelAnimationFrame(raf); clearTimeout(tardio); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, map]);
  return null;
}
