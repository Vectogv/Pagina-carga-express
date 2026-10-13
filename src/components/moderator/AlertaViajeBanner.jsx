import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Route, Truck } from 'lucide-react';
import useSocketPanel from '../../hooks/useSocketPanel';
import { avisar } from '../../utils/aviso';
import { formatCurrency } from '../../utils/format';
import DespertarConductores from './DespertarConductores';
import './EmergencyBanner.css';

// El servidor manda `motivo` como frase ("no recibió respuesta del conductor tras detenerse").
// Si algún día manda un código del conductor, se traduce aquí.
const MOTIVOS = {
  trancon: 'Trancón',
  descanso: 'Descanso',
  falla: 'Falla mecánica',
  necesito_ayuda: 'Necesita ayuda',
  sin_respuesta: 'Sin respuesta del conductor',
  desvio: 'Se desvió de la ruta',
};
const motivoLegible = (m) => MOTIVOS[m] || m || 'Sin avance';

/**
 * Avisos del socket moderator:trip_alert. Cada uno abre el detalle del viaje.
 * - tipo 'servicio_nuevo': entró un servicio en la zona (sin sonido; botón para despertar conductores).
 * - sin tipo: viaje intermunicipal sin avance.
 */
export default function AlertaViajeBanner() {
  const navigate = useNavigate();
  const socket = useSocketPanel();
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    if (!socket) return undefined;
    const onAlert = (p) => {
      if (!p?.viajeId) return;
      setAlertas((prev) => [p, ...prev.filter((a) => a.viajeId !== p.viajeId)].slice(0, 5));
      if (p.tipo === 'servicio_nuevo') return;
      avisar('Viaje sin avance', `Viaje #${p.viajeId}: ${motivoLegible(p.motivo)}`);
    };
    socket.on('moderator:trip_alert', onAlert);
    return () => socket.off('moderator:trip_alert', onAlert);
  }, [socket]);

  if (!alertas.length) return null;
  const quitar = (id) => setAlertas((prev) => prev.filter((a) => a.viajeId !== id));

  return (
    <div role="alert" style={{ display: 'grid', gap: 8 }}>
      {alertas.map((a) => (
        a.tipo === 'servicio_nuevo' ? (
          <div key={a.viajeId} className="card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Truck size={18} className="text-primary" style={{ flexShrink: 0, marginTop: 2 }} />
              <span className="text-sm" style={{ flex: 1, minWidth: 0 }}>
                <span className="text-strong">Nuevo servicio en {a.zonaNombre || a.zona || 'tu zona'}:</span>{' '}
                {a.origen} → {a.destino}, {formatCurrency(a.precio)}
                {' · '}{a.conectadosAvisados ?? 0} conectados avisados, {a.desconectadosLlamados ?? 0} desconectados llamados
              </span>
              <button type="button" className="btn btn--ghost btn--sm" aria-label="Descartar aviso" onClick={() => quitar(a.viajeId)}>
                <X size={16} />
              </button>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--soft-primary btn--sm" onClick={() => { quitar(a.viajeId); navigate(`/moderator/trips?viaje=${a.viajeId}`); }}>
                Ver viaje
              </button>
              <DespertarConductores viajeId={a.viajeId} />
            </div>
          </div>
        ) : (
        <div key={a.viajeId} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <button
            type="button"
            className="emergency-banner emergency-banner--new"
            onClick={() => { quitar(a.viajeId); navigate(`/moderator/trips?viaje=${a.viajeId}`); }}
          >
            <span className="emergency-banner__icon"><Route size={18} /></span>
            <span className="emergency-banner__text">
              <span className="emergency-banner__title">Viaje #{a.viajeId} sin avance</span>
              <span className="emergency-banner__meta">{motivoLegible(a.motivo)}{a.zona ? ` · ${a.zona}` : ''}</span>
            </span>
            <span className="emergency-banner__cta"><span className="emergency-banner__cta-text">Ver viaje</span><ChevronRight size={14} /></span>
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Descartar aviso" onClick={() => quitar(a.viajeId)}>
            <X size={16} />
          </button>
        </div>
        )
      ))}
    </div>
  );
}
