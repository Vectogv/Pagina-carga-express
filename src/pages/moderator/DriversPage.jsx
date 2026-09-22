import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check, Flag, X } from 'lucide-react';
import { getModeratorDrivers, notifyDriver, reportDriver, approveDriver, rejectDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, fullName, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, ConfirmDialog, Avatar, Button, StatusBadge,
  Textarea, Toast, ToastContainer,
} from '../../components/ui';

const TABS = [
  ['pendiente', 'Pendientes'],
  ['aprobado', 'Aprobados'],
  ['rechazado', 'Rechazados'],
  ['todos', 'Todos'],
];

const driverName = (r) => fullName(r.usuario || r);
const driverId = (r) => r.id || r.usuarioId;

export default function ModeratorDriversPage() {
  const { ciudadParams } = useModeratorCity();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState('pendiente');
  const closeToast = useCallback(() => setToast(null), []);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, limit: 100, ...ciudadParams };
      if (tab !== 'todos') params.estado = tab;
      const res = await getModeratorDrivers(params);
      setDrivers(toList(res.data, 'drivers'));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar conductores'));
    } finally {
      setLoading(false);
    }
  }, [tab, ciudadParams]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const showToast = (message, ok = true) => setToast({ message, variant: ok ? 'success' : 'danger' });
  const openAction = (type, r) => { setNota(''); setAction({ type, ...r }); };
  const closeAction = () => { setAction(null); setNota(''); };

  const handleNotify = async () => {
    try { await notifyDriver(driverId(action)); showToast('Notificación enviada'); } catch (err) { showToast(errorMessage(err, 'Error al notificar'), false); }
  };
  const handleReport = async () => {
    try {
      await reportDriver(driverId(action), { descripcion: nota.trim() });
      showToast('Reporte enviado al administrador');
      fetchDrivers();
    } catch (err) { showToast(errorMessage(err, 'Error al reportar'), false); }
  };
  const handleApprove = async () => {
    try { await approveDriver(driverId(action)); showToast('Conductor aprobado'); fetchDrivers(); } catch (err) { showToast(errorMessage(err, 'Error al aprobar'), false); }
  };
  const handleReject = async () => {
    try {
      await rejectDriver(driverId(action), { nota: nota.trim() });
      showToast('Conductor rechazado');
      fetchDrivers();
    } catch (err) { showToast(errorMessage(err, 'Error al rechazar'), false); }
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Conductor',
      render: (_, r) => (
        <div className="cell-user">
          <Avatar src={r.usuario?.avatar} name={driverName(r)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{driverName(r)}</span>
            <span className="cell-user__meta">{r.usuario?.email || r.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'telefono', label: 'Teléfono', render: (_, r) => r.usuario?.telefono || '—' },
    { key: 'placa', label: 'Placa', render: (v) => (v ? <span className="text-mono">{v}</span> : '—') },
    { key: 'ciudad', label: 'Ciudad', render: (v) => (v === 'california' ? 'cali' : (v || '—')) },
    { key: 'estadoVerificacion', label: 'Verificación', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, r) => {
        const pend = (r.estadoVerificacion || 'pendiente') === 'pendiente';
        return (
          <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
            {pend && (
              <Button size="sm" variant="soft-success" icon={<Check size={14} />} onClick={() => openAction('approve', r)}>Aprobar</Button>
            )}
            {pend && (
              <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => openAction('reject', r)}>Rechazar</Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => openAction('notify', r)} aria-label={`Notificar a ${driverName(r)}`} title="Notificar">
              <BellRing size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => openAction('report', r)} aria-label={`Reportar a ${driverName(r)}`} title="Reportar al administrador">
              <Flag size={15} />
            </Button>
          </div>
        );
      },
    },
  ];

  const counts = {
    pendiente: drivers.filter((d) => (d.estadoVerificacion || 'pendiente') === 'pendiente').length,
    aprobado: drivers.filter((d) => d.estadoVerificacion === 'aprobado').length,
    rechazado: drivers.filter((d) => d.estadoVerificacion === 'rechazado').length,
    todos: drivers.length,
  };
  const tabOptions = TABS.map(([value, label]) => ({ value, label, count: counts[value] }));

  const filtered = drivers.filter((d) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    const u = d.usuario || {};
    return `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || (u.telefono || '').includes(q)
      || (d.placa || '').toLowerCase().includes(q);
  });

  const actionEmail = action?.usuario?.email || '';

  return (
    <div className="page">
      <PageHeader title="Conductores" description="Verifica, notifica y reporta a los conductores de tu ciudad." />

      <div className="toolbar">
        <SearchInput value={filter} onChange={setFilter} placeholder="Buscar por nombre, placa, correo o teléfono" />
        <SegmentedFilter options={tabOptions} value={tab} onChange={setTab} ariaLabel="Estado de verificación" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={filter ? `Sin resultados para “${filter}”` : (tab === 'pendiente' ? 'Sin conductores pendientes' : 'No hay conductores en tu ciudad')}
      />

      <ConfirmDialog
        isOpen={action?.type === 'notify'}
        onClose={closeAction}
        onConfirm={handleNotify}
        title="Notificar conductor"
        message={`Se enviará una notificación push a ${actionEmail || driverName(action || {})}.`}
        confirmText="Notificar"
      />
      <ConfirmDialog
        isOpen={action?.type === 'approve'}
        onClose={closeAction}
        onConfirm={handleApprove}
        title="Aprobar conductor"
        message={`¿Confirmar la verificación de ${action ? driverName(action) : ''}? Se notificará al conductor.`}
        confirmText="Aprobar"
      />
      <ConfirmDialog
        isOpen={action?.type === 'reject'}
        onClose={closeAction}
        onConfirm={handleReject}
        title="Rechazar conductor"
        message={`La nota es obligatoria y se enviará al conductor${actionEmail ? ` ${actionEmail}` : ''}.`}
        confirmText="Rechazar"
        confirmDisabled={!nota.trim()}
        danger
      >
        <Textarea
          label="Motivo del rechazo"
          required
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Motivo del rechazo"
          rows={3}
        />
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={action?.type === 'report'}
        onClose={closeAction}
        onConfirm={handleReport}
        title="Reportar al administrador"
        message="El reporte será visible para el administrador en Reportes de moderadores."
        confirmText="Reportar"
        confirmDisabled={!nota.trim()}
        danger
      >
        <Textarea
          label="Descripción"
          required
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: Inactivo 2 semanas, no responde"
          rows={3}
        />
      </ConfirmDialog>

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
