import { ShieldCheck } from 'lucide-react';
import { Badge, StatusBadge } from '../../../components/ui';
import { formatTime } from '../../../utils/format';
import { userName } from './emergencyUtils';
import './EmergencyChat.css';

/** Historial (solo lectura) del chat de una emergencia. */
export default function EmergencyChat({ emergency, messages, loading, error }) {
  const requester = userName(emergency);
  const isStaff = (m) => m.remitente && m.remitente.id !== emergency.userId;

  const attendedBy = [...new Set(
    messages
      .filter((m) => isStaff(m) && m.remitente.nombre !== requester)
      .map((m) => m.remitente.nombre),
  )];

  return (
    <div className="echat">
      {attendedBy.length > 0 ? (
        <div className="echat__attended">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Atendido por <strong className="text-strong">{attendedBy.join(', ')}</strong></span>
          <StatusBadge status={emergency.atendida ? 'resuelta' : 'atendida'} label={emergency.atendida ? 'Resuelta' : 'En gestión'} size="sm" />
        </div>
      ) : emergency.atendida && (
        <div className="echat__attended">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Emergencia atendida</span>
        </div>
      )}

      {loading && <p className="echat__status">Cargando chat…</p>}
      {error && <p className="echat__status text-danger">{error}</p>}
      {!loading && !error && messages.length === 0 && <p className="echat__status">Sin mensajes en el chat.</p>}

      {messages.length > 0 && (
        <div className="echat__messages">
          {messages.map((m) => {
            const own = isStaff(m);
            return (
              <div key={m.id} className={`echat__msg ${own ? 'echat__msg--own' : ''}`}>
                <div className="echat__meta">
                  <span className="echat__author">{m.remitente?.nombre || (own ? 'Moderador' : 'Usuario')}</span>
                  {m.remitente?.esModerador && <Badge variant="warning" size="sm">Moderador</Badge>}
                  <span>{formatTime(m.createdAt)}</span>
                </div>
                <div className="echat__bubble">{m.mensaje}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
