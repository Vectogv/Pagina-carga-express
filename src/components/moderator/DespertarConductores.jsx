import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { llamarConductores } from '../../api/moderator';
import { errorMessage } from '../../utils/format';
import { Button, Modal } from '../ui';
import VistaAviso from '../VistaAviso';

/** Push a los conductores desconectados de la zona (POST /api/moderator/trips/:id/llamar-conductores). */
// Mismo texto que arma el servidor (llamado_conductores_service.ts) para el push `viaje_disponible`.
const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

export default function DespertarConductores({ viajeId, origen, destino, precio, zona }) {
  const [busy, setBusy] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [msg, setMsg] = useState('');

  const llamar = async () => {
    setBusy(true);
    setAbierto(false);
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
      <Button size="sm" variant="secondary" icon={<BellRing size={14} />} loading={busy} onClick={() => setAbierto(true)}>
        Despertar conductores
      </Button>
      <Modal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        title="Despertar conductores"
        description="Así les llega el aviso a los conductores desconectados de la zona."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button loading={busy} onClick={llamar}>Enviar aviso</Button>
          </>
        )}
      >
        <VistaAviso
          tipo="push"
          titulo={`🚚 Servicio de ${pesos(precio)} en ${zona || 'tu zona'}`}
          mensaje={`${origen || 'Origen'} → ${destino || 'Destino'} · Conéctate para ofertar.`}
        />
      </Modal>
      {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
    </span>
  );
}
