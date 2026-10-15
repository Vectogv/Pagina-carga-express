import L from 'leaflet';
import { iconoVehiculo } from '../../pages/cliente/VehiculoMarcador';

// Marcadores compartidos de los mapas del panel (Leaflet + OpenStreetMap, sin Mapbox).
// Las clases viven en panel.css (.panel-pin--*).
const pin = (html, clase, lado) => L.divIcon({
  className: '',
  html: `<div class="panel-pin ${clase}">${html}</div>`,
  iconSize: [lado, lado],
  iconAnchor: [lado / 2, lado / 2],
});

export const PINES = {
  A: pin('A', 'panel-pin--letra panel-pin--on', 26),
  B: pin('B', 'panel-pin--letra panel-pin--fin', 26),
  ultimo: pin('', 'panel-pin--ultimo', 16),
  conductor: iconoVehiculo('camioneta', undefined, 18), // sin identidad ni tipo (p. ej. SOS): dibujo genérico
  sos: pin('!', 'panel-pin--sos', 26),
  cierre: pin('⚑', 'panel-pin--cierre', 26),
};
