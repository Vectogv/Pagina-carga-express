import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { llamarConductores } from '../../api/moderator';
import { errorMessage } from '../../utils/format';
import { Button } from '../ui';

/** Push a los conductores desconectados de la zona (POST /api/moderator/trips/:id/llamar-conductores). */
export default function DespertarConductores({ viajeId }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const llamar = async () => {
    setBusy(true);
    try {
      const { data } = await llamarConductores(viajeId);
      const n = data?.llamados ?? 0;
      setMsg(n ? `Se llamó a ${n} conductor${n === 1 ? '' : 'es'}` : 'No hay conductores para llamar ahora');
    } catch (err) {
      setMsg(errorMessage(err, 'No se pudo llamar a los conductores'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="row" style={{ alignItems: 'center', gap: 8 }}>
      <Button size="sm" variant="secondary" icon={<BellRing size={14} />} loading={busy} onClick={llamar}>
        Despertar conductores
      </Button>
      {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
    </span>
  );
}
