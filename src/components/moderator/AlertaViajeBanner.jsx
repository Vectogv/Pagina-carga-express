import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Route } from 'lucide-react';
import useSocketPanel from '../../hooks/useSocketPanel';
import { avisar } from '../../utils/aviso';
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

/** Avisos de viajes intermunicipales sin avance (socket moderator:trip_alert). Cada uno abre el detalle del viaje. */
export default function AlertaViajeBanner() {
  const navigate = useNavigate();
  const socket = useSocketPanel();
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    if (!socket) return undefined;
    const onAlert = (p) => {
      if (!p?.viajeId) return;
      setAlertas((prev) => [p, ...prev.filter((a) => a.viajeId !== p.viajeId)].slice(0, 5));
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
      ))}
    </div>
  );
}
