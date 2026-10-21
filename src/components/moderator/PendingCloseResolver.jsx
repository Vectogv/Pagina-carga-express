import { useState } from 'react';
import { CheckCheck, Gavel, ShieldAlert } from 'lucide-react';
import { resolveClose, sancionarConductor } from '../../api/moderator';
import { crearAdminSancion } from '../../api/admin';
import { errorMessage } from '../../utils/format';
import { Button } from '../ui';
import { Textarea } from '../ui/Input/Input';
import { SancionModal } from '../panel/sanciones';

// Cierre pendiente: `pendiente_confirmacion` (el cliente no respondió a tiempo) o
// `cierre_en_revision` (el conductor cerró lejos del destino y el cliente respondió o venció).
// Acciones: entrega válida, disputa o sancionar al conductor (la sanción no cierra el viaje).
export default function PendingCloseResolver({ tripId, trip, area = 'moderator', onResolved, showTitle = true }) {
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sancionar, setSancionar] = useState(false);

  const enRevision = trip?.estado === 'cierre_en_revision';
  const distancia = trip?.distanciaCierreKm ?? trip?.cierre?.distanciaKm;
  const justificacion = trip?.justificacionCierre ?? trip?.cierre?.justificacion;
  const respuesta = trip?.respuestaCliente;
  const esAdmin = area === 'admin';
  // Moderador: conductores.id; admin: users.id (usuarioId).
  const conductorRef = esAdmin
    ? (trip?.conductor?.usuarioId ?? trip?.conductor?.userId)
    : trip?.conductor?.id;

  const resolve = async (accion) => {
    if (nota.trim().length < 10) {
      setError('La nota debe tener al menos 10 caracteres');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolveClose(tripId, { accion, nota: nota.trim() });
      setNota('');
      onResolved(accion === 'entrega_valida' ? 'finalizar' : accion);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === 'CONFIRMACION_EN_PLAZO' && data?.minutosRestantes != null) {
        setError(`El cliente aún puede confirmar. Intenta de nuevo en ${data.minutosRestantes} min.`);
      } else {
        setError(errorMessage(err, 'No se pudo resolver el cierre'));
      }
    } finally {
      setBusy(false);
    }
  };

  const aplicarSancion = async (data) => {
    if (esAdmin) await crearAdminSancion({ usuarioId: conductorRef, ...data });
    else await sancionarConductor(conductorRef, data);
    setSancionar(false);
    onResolved?.('sancion');
  };

  return (
    <section className="trip-detail__section">
      {showTitle && <h4 className="section-title"><Gavel size={14} /> Resolver cierre</h4>}
      {enRevision ? (
        <div className="stack" style={{ gap: 4 }}>
          <p className="text-sm">
            <strong>Cierre fuera del destino</strong>
            {distancia != null && <> · el conductor cerró a {Number(distancia).toFixed(1)} km del destino</>}.
          </p>
          {justificacion && <p className="text-sm text-muted">Justificación del conductor: «{justificacion}»</p>}
          {respuesta && <p className="text-sm text-muted">Respuesta del cliente: {respuesta}</p>}
          <p className="text-sm text-muted">
            Revisa fotos, chat y recorrido. Decide si la entrega es válida, si pasa a disputa o si hay que sancionar.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          El cliente no confirmó ni rechazó el cierre a tiempo. Explica qué pasó y decide si la entrega es válida
          o se envía a disputa.
        </p>
      )}
      <Textarea
        label="Nota de la resolución (mínimo 10 caracteres)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej.: el conductor entregó la carga según las fotos y el chat, se da por válida."
        disabled={busy}
      />
      {error && <div className="page-error" role="alert">{error}</div>}
      <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Button size="sm" variant="success" icon={<CheckCheck size={14} />} loading={busy} onClick={() => resolve('entrega_valida')}>
          Entrega válida
        </Button>
        <Button size="sm" variant="danger" icon={<Gavel size={14} />} loading={busy} onClick={() => resolve('disputa')}>
          Disputa
        </Button>
        {conductorRef != null && (
          <Button size="sm" variant="ghost" icon={<ShieldAlert size={14} />} disabled={busy} onClick={() => setSancionar(true)}>
            Sancionar
          </Button>
        )}
      </div>
      <SancionModal
        isOpen={sancionar}
        onClose={() => setSancionar(false)}
        esAdmin={esAdmin}
        viajeId={tripId}
        titulo="Sancionar al conductor"
        onSubmit={aplicarSancion}
      />
    </section>
  );
}
