import VistaAviso from '../../components/VistaAviso';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Check, Eye, ShieldAlert, X } from 'lucide-react';
import {
  getVerifications, approveVerification, rejectVerification, resolveSoatException,
  notifyDriver, notificarModeradorVerificacion,
} from '../../api/admin';
import { faltantesDe, textoFaltantes } from '../../utils/documentos';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import {
  Avatar, Badge, Button, ConfirmDialog, DataTable, Modal, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Toast, ToastContainer,
} from '../../components/ui';
import ExcepcionesSoat from '../../components/verificacion/ExcepcionesSoat';
import DetalleVerificacion from '../../components/verificacion/DetalleVerificacion';
import NotificarDocumentosDialog from '../moderator/NotificarDocumentosDialog';

const hoy = () => new Date().toISOString().slice(0, 10);
const vencido = (fecha) => !!fecha && String(fecha).slice(0, 10) < hoy();

const ESTADO_EXCEPCION = {
  pendiente: { label: 'En revisión', variant: 'warning' },
  aprobada: { label: 'Aprobada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
};

// GET /api/admin/verifications (admin_controller.ts#pendingVerifications) solo
// trae conductores con estadoVerificacion 'pendiente' y no incluye estado por
// documento; la única acción posible es aprobar o rechazar al conductor entero.
export default function VerificationsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'soat' ? 'soat' : 'documentacion';
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);
  const [aviso, setAviso] = useState(null); // diálogo "Notificar al moderador de zona"
  const [msgMod, setMsgMod] = useState('');
  const [notificando, setNotificando] = useState(null); // diálogo "Notificar al conductor"

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVerifications({ page: 1, limit: 100 });
      setVerifications(toList(res.data));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las verificaciones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const closeConfirm = () => { setConfirmAction(null); setNota(''); };

  const handleApprove = async () => {
    try {
      await approveVerification(confirmAction.id);
      closeConfirm();
      setSelected(null);
      await fetchVerifications();
    } catch (err) {
      setError(errorMessage(err, 'Error al aprobar verificación'));
    }
  };

  const handleReject = async () => {
    try {
      const payload = nota.trim() ? { nota: nota.trim() } : {};
      await rejectVerification(confirmAction.id, payload);
      closeConfirm();
      setSelected(null);
      await fetchVerifications();
    } catch (err) {
      setError(errorMessage(err, 'Error al rechazar verificación'));
    }
  };

  const ask = (row, type) => (e) => {
    e.stopPropagation();
    setConfirmAction({ ...row, type });
  };

  const avisarModerador = async () => {
    const c = aviso;
    setAviso(null);
    try {
      const res = await notificarModeradorVerificacion(c.id, msgMod.trim() ? { mensaje: msgMod.trim() } : {});
      const n = res.data?.moderadoresAvisados ?? 1;
      setToast({ msg: `Aviso enviado a ${n} moderador${n === 1 ? '' : 'es'} de ${res.data?.zona || c.ciudad || 'la zona'}`, variant: 'success' });
    } catch (err) {
      setToast({ msg: errorMessage(err, 'No se pudo avisar al moderador'), variant: 'danger' });
    }
  };

  const notificarConductor = async (data) => {
    const c = notificando;
    setNotificando(null);
    try {
      await notifyDriver(c.id, data || {});
      setToast({ msg: 'Conductor notificado', variant: 'success' });
    } catch (err) {
      setToast({ msg: errorMessage(err, 'No se pudo notificar al conductor'), variant: 'danger' });
    }
  };

  const columns = [
    {
      key: 'usuario',
      label: 'Conductor',
      render: (_, row) => (
        <div className="cell-user">
          <Avatar name={fullName(row.usuario)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{fullName(row.usuario) || 'Sin nombre'}</span>
            <span className="cell-user__meta">{row.usuario?.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'cedula', label: 'Cédula', render: (v) => v || '—' },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      render: (_, row) => (
        <div className="cell-user__text">
          <span>{row.tipoVehiculo || '—'}</span>
          <span className="cell-user__meta">{row.placa || ''}{row.capacidad ? ` (${row.capacidad})` : ''}</span>
        </div>
      ),
    },
    { key: 'telefono', label: 'Teléfono', render: (_, row) => row.usuario?.telefono || '—' },
    {
      key: 'soat',
      label: 'SOAT',
      render: (_, row) => {
        if (row.excepcionSoatEstado) {
          const e = ESTADO_EXCEPCION[row.excepcionSoatEstado];
          return <Badge variant={e.variant}>Excepción: {e.label.toLowerCase()}</Badge>;
        }
        if (!row.fotoSoat) return <span className="cell-user__meta">Sin SOAT</span>;
        return <span className={vencido(row.soatVence) ? 'text-danger' : ''}>{formatDate(row.soatVence)}</span>;
      },
    },
    { key: 'createdAt', label: 'Solicitado', render: (v) => <span className="nowrap">{formatDate(v)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => {
        // Sin los 6 documentos y el número de cédula el servidor responde 422: se bloquea aquí con el motivo.
        const bloqueado = textoFaltantes(faltantesDe(row));
        return (
          <div className="acciones-fila">
            <div className="acciones-fila__botones">
              <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setSelected(row); }}>
                Ver
              </Button>
              <Button size="sm" variant="soft-success" icon={<Check size={14} />} disabled={!!bloqueado} title={bloqueado || undefined} onClick={ask(row, 'approve')}>Aprobar</Button>
              <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={ask(row, 'reject')}>Rechazar</Button>
            </div>
            {bloqueado && <span className="acciones-fila__aviso" title={bloqueado}>{bloqueado}</span>}
          </div>
        );
      },
    },
  ];

  const isApprove = confirmAction?.type === 'approve';
  const confirmName = fullName(confirmAction?.usuario) || 'este conductor';

  return (
    <div className="page">
      <PageHeader title="Verificaciones" description="Conductores nuevos esperando que revises su licencia, SOAT, técnico-mecánica, tarjeta de propiedad, foto del vehículo, foto del conductor y número de cédula. Para aprobarlos necesitan todo eso y SOAT vigente o una excepción de SOAT aprobada. Mientras no los apruebes no pueden recibir viajes." />

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="icon" variant="ghost" onClick={() => setError(null)} aria-label="Cerrar mensaje de error">
            <X size={15} />
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setParams(v === 'soat' ? { tab: 'soat' } : {}, { replace: true })}>
        <TabsList>
          <TabsTrigger value="documentacion">Documentación</TabsTrigger>
          <TabsTrigger value="soat">Excepciones de SOAT</TabsTrigger>
        </TabsList>
        <TabsContent value="documentacion">
          <DataTable
            columns={columns}
            data={verifications}
            loading={loading}
            emptyMessage="No hay verificaciones pendientes"
            onRowClick={setSelected}
          />
        </TabsContent>
        <TabsContent value="soat">
          <ExcepcionesSoat cargar={getVerifications} resolver={resolveSoatException} />
        </TabsContent>
      </Tabs>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Detalle de verificación"
        size="lg"
        footer={selected && (
          <div className="dv-pie">
            <Button variant="secondary" onClick={() => setSelected(null)}>Cerrar</Button>
            <Button variant="soft-danger" icon={<X size={14} />} onClick={ask(selected, 'reject')}>Rechazar</Button>
            <Button variant="soft-primary" icon={<Bell size={14} />} onClick={() => setNotificando(selected)}>Notificar al conductor</Button>
            <Button variant="soft-primary" icon={<ShieldAlert size={14} />} onClick={() => { setMsgMod(''); setAviso(selected); }}>Notificar al moderador de zona</Button>
            <Button
              variant="soft-success"
              icon={<Check size={14} />}
              disabled={!!textoFaltantes(faltantesDe(selected))}
              title={textoFaltantes(faltantesDe(selected)) || undefined}
              onClick={ask(selected, 'approve')}
            >
              Aprobar
            </Button>
          </div>
        )}
      >
        {selected && (
          <div className="stack">
            <DetalleVerificacion c={selected} />
          </div>
        )}
      </Modal>

      {notificando && (
        <NotificarDocumentosDialog
          onClose={() => setNotificando(null)}
          faltantes={faltantesDe(notificando)}
          destinatario={notificando.usuario?.email || fullName(notificando.usuario)}
          onEnviar={notificarConductor}
        />
      )}
      <ConfirmDialog
        isOpen={!!aviso}
        onClose={() => setAviso(null)}
        onConfirm={avisarModerador}
        title="Notificar al moderador de zona"
        message={aviso ? `Se avisará a los moderadores activos de ${aviso.ciudad || 'la zona'} para que revisen a ${fullName(aviso.usuario)}.` : ''}
        confirmText="Avisar"
      >
        {aviso && (
          <div className="stack">
            <span className="text-sm">
              {textoFaltantes(faltantesDe(aviso)) || 'Tiene todos los documentos.'}
            </span>
            <Textarea label="Mensaje para el moderador (opcional)" value={msgMod} onChange={(e) => setMsgMod(e.target.value)} rows={2} maxLength={500} />
            <VistaAviso tipo="bandeja" titulo="Revisar solicitud de conductor" mensaje={`Gerencia pide revisar a ${fullName(aviso.usuario)}${faltantesDe(aviso).length ? ` (${textoFaltantes(faltantesDe(aviso)).toLowerCase()})` : ''}. Notifica al conductor o elimina la solicitud.${msgMod.trim() ? `
Nota de gerencia: ${msgMod.trim()}` : ''}`} />
          </div>
        )}
      </ConfirmDialog>
      {toast && (
        <ToastContainer>
          <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} duration={6000} />
        </ToastContainer>
      )}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={isApprove ? handleApprove : handleReject}
        title={isApprove ? 'Aprobar verificación' : 'Rechazar verificación'}
        message={isApprove
          ? `¿Aprobar la verificación de ${confirmName}?`
          : `¿Rechazar la verificación de ${confirmName}? Esta acción no se puede deshacer.`}
        confirmText={isApprove ? 'Aprobar' : 'Rechazar'}
        danger={!isApprove}
      >
        {!isApprove && (
          <Textarea
            label="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: Documento ilegible"
            rows={2}
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
