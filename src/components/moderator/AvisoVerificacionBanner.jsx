import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, BadgeCheck } from 'lucide-react';
import useSocketPanel from '../../hooks/useSocketPanel';
import { avisar } from '../../utils/aviso';
import './EmergencyBanner.css';

/** Aviso de gerencia (socket moderator:verificacion_revisar): abre la ficha del conductor a revisar. */
export default function AvisoVerificacionBanner() {
  const navigate = useNavigate();
  const socket = useSocketPanel();
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    if (!socket) return undefined;
    const onAviso = (p) => {
      if (!p?.conductorId) return;
      setAvisos((prev) => [p, ...prev.filter((a) => a.conductorId !== p.conductorId)].slice(0, 5));
      avisar('Revisar solicitud de conductor', `Gerencia pide revisar a ${p.conductorNombre || 'un conductor'}`);
    };
    socket.on('moderator:verificacion_revisar', onAviso);
    return () => socket.off('moderator:verificacion_revisar', onAviso);
  }, [socket]);

  if (!avisos.length) return null;
  const quitar = (id) => setAvisos((prev) => prev.filter((a) => a.conductorId !== id));

  return (
    <div role="alert" style={{ display: 'grid', gap: 8 }}>
      {avisos.map((a) => (
        <div key={a.conductorId} style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <button
            type="button"
            className="emergency-banner emergency-banner--new"
            onClick={() => { quitar(a.conductorId); navigate(`/moderator/drivers/${a.conductorId}`); }}
          >
            <span className="emergency-banner__icon"><BadgeCheck size={18} /></span>
            <span className="emergency-banner__text">
              <span className="emergency-banner__title">Revisar a {a.conductorNombre || 'un conductor'}</span>
              <span className="emergency-banner__meta">
                {a.faltantes?.length ? `Faltan ${a.faltantes.length} documento(s)` : 'Solicitud pendiente'}
                {a.mensaje ? ` · ${a.mensaje}` : ''}
              </span>
            </span>
            <span className="emergency-banner__cta"><span className="emergency-banner__cta-text">Ver ficha</span><ChevronRight size={14} /></span>
          </button>
          <button type="button" className="btn btn--ghost" aria-label="Descartar aviso" onClick={() => quitar(a.conductorId)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
