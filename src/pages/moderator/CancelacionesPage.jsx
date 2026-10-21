import { useState, useEffect, useCallback } from 'react';
import { Check, X, Hand } from 'lucide-react';
import {
  getModeratorCancelaciones, tomarCancelacion, approveModeratorCancelacion, rejectModeratorCancelacion,
} from '../../api/moderator';
import { errorMessage, formatDateTime, toList } from '../../utils/format';
import {
  PageHeader, DataTable, ConfirmDialog, StatusBadge, Button, Badge, Toast, ToastContainer,
} from '../../components/ui';
import { TarjetaPersona } from '../../components/panel';
import { direccionCorta } from '../../utils/direccion';

const hist = (h) => (h ? `${h.total ?? 0} viajes · ${h.canceladas ?? 0} cancelados` : null);

// Solicitudes de cancelación con el viaje ya empezado (3.2). El servidor escala el aviso:
// recordatorio a los 10 min y, a los 20, queda visible para gerencia (`escaladaAdminAt`).
export default function ModeratorCancelacionesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const res = await getModeratorCancelaciones({ estado: 'pendiente' });
      setRows(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las solicitudes de cancelación'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000); // los avisos de 10/20 min dependen del tiempo
    return () => clearInterval(t);
  }, [cargar]);

  const ejecutar = async (fn, ok) => {
    try {
      await fn();
      setToast({ message: ok, variant: 'success' });
    } catch (err) {
      setToast({ message: errorMessage(err, 'No se pudo completar la acción'), variant: 'error' });
    } finally {
      setConfirm(null);
      cargar();
    }
  };

  const columns = [
    {
      key: 'acciones', label: '',
      render: (_, r) => (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {!r.tomadaPor && (
            <Button size="sm" variant="primary" icon={<Hand size={14} />}
              onClick={() => ejecutar(() => tomarCancelacion(r.id), 'Solicitud tomada')}>Tomar</Button>
          )}
          <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={() => setConfirm({ r, accion: 'approve' })}>Aprobar</Button>
          <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => setConfirm({ r, accion: 'reject' })}>Rechazar</Button>
        </div>
      ),
    },
    {
      key: 'viajeId', label: 'Viaje',
      render: (v, r) => (
        <div className="cell-user__text">
          <span className="text-mono text-strong">#{String(v).slice(0, 8)}</span>
          <span className="cell-user__meta">{direccionCorta(r.origenDireccion)} → {direccionCorta(r.destinoDireccion)}</span>
          <StatusBadge status={r.viajeEstado} />
        </div>
      ),
    },
    {
      key: 'solicitante', label: 'Pide',
      render: (v, r) => (
        <div className="cell-user__text">
          <strong>{r.solicitanteRol === 'conductor' ? 'Conductor' : 'Cliente'}</strong>
          {r.distanciaOrigenM != null && <span className="cell-user__meta">a {Math.round(r.distanciaOrigenM)} m del origen</span>}
        </div>
      ),
    },
    { key: 'motivo', label: 'Motivo', render: (v) => <span style={{ whiteSpace: 'normal' }}>{v || '—'}</span> },
    { key: 'cliente', label: 'Cliente', render: (v, r) => v ? <div><TarjetaPersona persona={v} tipo="cliente" area="moderator" /><span className="text-sm text-muted">{hist(r.historial?.cliente)}</span></div> : '—' },
    { key: 'conductor', label: 'Conductor', render: (v, r) => v ? <div><TarjetaPersona persona={v} tipo="conductor" area="moderator" /><span className="text-sm text-muted">{hist(r.historial?.conductor)}</span></div> : '—' },
    {
      key: 'estado', label: 'Seguimiento',
      render: (_, r) => (
        <div className="stack" style={{ gap: 4 }}>
          {r.tomadaPor ? <Badge variant="info">Tomada</Badge> : <Badge variant="warning">Sin tomar</Badge>}
          {r.escaladaAdminAt ? <Badge variant="danger">Escalada a gerencia</Badge>
            : r.recordatorioAt ? <Badge variant="warning">Recordatorio enviado</Badge> : null}
          {r.historial?.pareja && <span className="text-sm text-muted">Pareja: {hist(r.historial.pareja)}</span>}
          <span className="text-sm text-muted">{formatDateTime(r.createdAt)}</span>
        </div>
      ),
    },
  ];

  const aprobar = confirm?.accion === 'approve';

  return (
    <div className="page">
      <PageHeader
        title="Solicitudes de cancelación"
        description="Con el viaje ya empezado, cliente o conductor piden permiso para cancelar. Toma la solicitud, revisa el historial y decide. A los 10 min se envía un recordatorio y a los 20 pasa a gerencia."
      />
      {error && <div className="page-error" role="alert">{error}</div>}
      <DataTable columns={columns} data={rows} loading={loading && rows.length === 0} emptyMessage="No hay solicitudes de cancelación pendientes en tu zona." />
      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => ejecutar(
          () => (aprobar ? approveModeratorCancelacion(confirm.r.id) : rejectModeratorCancelacion(confirm.r.id)),
          aprobar ? 'Cancelación aprobada' : 'Cancelación rechazada',
        )}
        title={aprobar ? 'Aprobar cancelación' : 'Rechazar cancelación'}
        message={aprobar ? 'El viaje se cancelará y se avisará a las dos partes.' : 'El viaje seguirá su curso y se avisará a las dos partes.'}
        confirmText={aprobar ? 'Aprobar' : 'Rechazar'}
        danger={!aprobar}
      />
      {toast && (<ToastContainer><Toast message={toast.message} variant={toast.variant} onClose={closeToast} /></ToastContainer>)}
    </div>
  );
}
