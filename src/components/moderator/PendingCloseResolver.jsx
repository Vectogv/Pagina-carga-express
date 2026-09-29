import { useState } from 'react';
import { CheckCheck, Gavel } from 'lucide-react';
import { resolveClose } from '../../api/moderator';
import { errorMessage } from '../../utils/format';
import { Button } from '../ui';
import { Textarea } from '../ui/Input/Input';

// H1: el cliente tuvo `confirmacionTimeoutMin` minutos para confirmar o rechazar
// el cierre del viaje y no respondió; el moderador de la zona (o un admin) lo resuelve.
// Mismas opciones y textos que la pestaña "Cierres" de la app.
export default function PendingCloseResolver({ tripId, onResolved, showTitle = true }) {
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const resolve = async (resolucion) => {
    if (nota.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolveClose(tripId, { resolucion, nota: nota.trim() });
      setNota('');
      onResolved(resolucion);
    } catch (err) {
      const data = err?.response?.data;
      // 409: el cliente todavía está dentro de su plazo para confirmar.
      if (data?.code === 'CONFIRMACION_EN_PLAZO' && data?.minutosRestantes != null) {
        setError(`El cliente aún puede confirmar. Intenta de nuevo en ${data.minutosRestantes} min.`);
      } else {
        setError(errorMessage(err, 'No se pudo resolver el cierre'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="trip-detail__section">
      {showTitle && <h4 className="section-title"><Gavel size={14} /> Resolver cierre</h4>}
      <p className="text-sm text-muted">
        El cliente no confirmó ni rechazó el cierre a tiempo. Explica qué pasó y decide si el viaje se finaliza
        o se envía a disputa.
      </p>
      <Textarea
        label="Nota de la resolución (mínimo 10 caracteres)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej.: el conductor entregó la carga según las fotos y el chat, se finaliza a su favor."
        disabled={busy}
      />
      {error && <div className="page-error" role="alert">{error}</div>}
      <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Button size="sm" variant="success" icon={<CheckCheck size={14} />} loading={busy} onClick={() => resolve('finalizar')}>
          Finalizar viaje
        </Button>
        <Button size="sm" variant="danger" icon={<Gavel size={14} />} loading={busy} onClick={() => resolve('disputa')}>
          Enviar a disputa
        </Button>
      </div>
    </section>
  );
}
