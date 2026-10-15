import { useEffect, useMemo, useRef } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import { Avatar } from '../ui';
import { iconoVehiculo, setRumbo } from '../../pages/cliente/VehiculoMarcador';

// Tamaño en el panel: proporcionado a calles con varios conductores a la vista.
const ANCHO_PANEL = 18;

const nombreDe = (p) => p.nombre || [p.usuario?.nombre, p.usuario?.apellido].filter(Boolean).join(' ') || 'Conductor';

/** Contenido compacto: solo foto, nombre, placa y calificación (lo que existe; lo que no llega no se pinta). */
export function TarjetaConductorMapa({ persona }) {
  const nombre = nombreDe(persona);
  const foto = persona.avatar || persona.fotoConductor || persona.usuario?.avatar;
  const cal = Number(persona.calificacion);
  return (
    <div className="tarjeta-cond">
      <Avatar src={foto} name={nombre} size={44} />
      <div className="tarjeta-cond__datos">
        <strong>{nombre}</strong>
        <div className="tarjeta-cond__fila">
          {persona.placa && <span className="tarjeta-cond__placa">{persona.placa}</span>}
          {cal > 0 && <span className="tarjeta-cond__cal" title="Calificación">★ {cal.toFixed(1)}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Vehículo del conductor (dibujo de la app según su tipo) con tarjeta al pasar el mouse (Tooltip)
 * y al tocar (Popup). props: { persona, position, rumbo?, estado?: 'on'|'sin-senal', onPerfil?, extra? (nodo bajo la tarjeta), zIndexOffset? }
 */
export default function MarcadorConductor({ persona, position, rumbo = 0, estado, onPerfil, extra, zIndexOffset = 300 }) {
  const icono = useMemo(() => iconoVehiculo(persona.tipoVehiculo, estado, ANCHO_PANEL), [persona.tipoVehiculo, estado]);
  const ref = useRef(null);
  useEffect(() => { setRumbo(ref.current, rumbo); }, [rumbo, icono, position]);
  return (
    <Marker
      ref={ref}
      position={position}
      icon={icono}
      zIndexOffset={zIndexOffset}
      eventHandlers={{
        add: (e) => { const el = e.target.getElement()?.querySelector('.cli-veh'); if (el) el.style.transform = `rotate(${rumbo}deg)`; },
        popupopen: (e) => e.target.closeTooltip(),
      }}
    >
      <Tooltip direction="top" offset={[0, -18]} className="tarjeta-cond-tip"><TarjetaConductorMapa persona={persona} /></Tooltip>
      <Popup>
        <div className="stack">
          {extra}
          <TarjetaConductorMapa persona={persona} />
          {onPerfil && <button type="button" className="tarjeta-cond__perfil" onClick={onPerfil}>Ver perfil</button>}
        </div>
      </Popup>
    </Marker>
  );
}
