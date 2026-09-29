import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check, FileText, Flag, X } from 'lucide-react';
import { getModeratorDrivers, notifyDriver, reportDriver, approveDriver, rejectDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import { resolveStorageUrl } from '../../utils/storage';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, ConfirmDialog, Modal, Avatar, Button, StatusBadge,
  Textarea, Toast, ToastContainer,
} from '../../components/ui';

const TABS = [
  ['pendiente', 'Pendientes'],
  ['aprobado', 'Aprobados'],
  ['rechazado', 'Rechazados'],
  ['todos', 'Todos'],
];

const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];
const EMPTY_BY_ESTADO = { pendiente: [], aprobado: [], rechazado: [] };

const driverName = (r) => fullName(r.usuario || r);
const driverId = (r) => r.id || r.usuarioId;
const byNewest = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

function Photo({ label, path }) {
  const url = resolveStorageUrl(path);
  return (
    <div className="stack">
      <span className="detail-list__label">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label} en una pestaña nueva`}>
          <img src={url} alt={label} className="thumb thumb--link" loading="lazy" />
        </a>
      ) : (
        <span className="text-muted text-sm">Sin cargar</span>
      )}
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div className="detail-list__item">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{children || '—'}</span>
    </div>
  );
}

export default function ModeratorDriversPage() {
  const { ciudadParams } = useModeratorCity();
  // Una petición por estado: así cada pestaña tiene su propio conteo aunque se
  // esté viendo otra (el backend filtra y pagina por estado, máx. 100 por página).
  const [byEstado, setByEstado] = useState(EMPTY_BY_ESTADO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState('pendiente');
  const [docs, setDocs] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all(
        ESTADOS.map((estado) => getModeratorDrivers({ page: 1, limit: 100, estado, ...ciudadParams })),
      );
      const next = {};
      ESTADOS.forEach((estado, i) => { next[estado] = toList(responses[i].data, 'drivers'); });
      setByEstado(next);
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar conductores'));
    } finally {
      setLoading(false);
    }
  }, [ciudadParams]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const showToast = (message, ok = true) => setToast({ message, variant: ok ? 'success' : 'danger' });
  const openAction = (type, r) => { setDocs(null); setNota(''); setAction({ type, ...r }); };
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
          <Avatar src={r.fotoConductor} name={driverName(r)} />
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
            <Button size="icon" variant="ghost" onClick={() => setDocs(r)} aria-label={`Ver documentos de ${driverName(r)}`} title="Ver documentos">
              <FileText size={15} />
            </Button>
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

  const drivers = tab === 'todos'
    ? ESTADOS.flatMap((e) => byEstado[e]).sort(byNewest)
    : byEstado[tab] || [];
  const counts = {
    pendiente: byEstado.pendiente.length,
    aprobado: byEstado.aprobado.length,
    rechazado: byEstado.rechazado.length,
    todos: ESTADOS.reduce((acc, e) => acc + byEstado[e].length, 0),
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

      <Modal
        isOpen={!!docs}
        onClose={() => setDocs(null)}
        title="Documentos del conductor"
        description={docs ? driverName(docs) : undefined}
        size="lg"
        footer={docs && (
          <>
            <Button variant="secondary" onClick={() => setDocs(null)}>Cerrar</Button>
            {(docs.estadoVerificacion || 'pendiente') === 'pendiente' && (
              <>
                <Button variant="soft-danger" icon={<X size={14} />} onClick={() => openAction('reject', docs)}>Rechazar</Button>
                <Button variant="soft-success" icon={<Check size={14} />} onClick={() => openAction('approve', docs)}>Aprobar</Button>
              </>
            )}
          </>
        )}
      >
        {docs && (
          <div className="stack">
            <div className="detail-list">
              <Detail label="Estado"><StatusBadge status={docs.estadoVerificacion || 'pendiente'} /></Detail>
              <Detail label="Nombre">{docs.usuario?.nombre}</Detail>
              <Detail label="Teléfono">{docs.usuario?.telefono}</Detail>
              <Detail label="Correo">{docs.usuario?.email}</Detail>
              <Detail label="Cédula">{docs.cedula}</Detail>
              <Detail label="Placa">{docs.placa && <span className="text-mono">{docs.placa}</span>}</Detail>
              <Detail label="Tipo de vehículo">{docs.tipoVehiculo}</Detail>
              <Detail label="Ciudad">{docs.ciudad}</Detail>
              <Detail label="Fecha de registro">{docs.createdAt && formatDate(docs.createdAt)}</Detail>
              {docs.notaRechazo && <Detail label="Nota de rechazo">{docs.notaRechazo}</Detail>}
            </div>

            <hr className="divider" />
            <h3 className="section-title">Documentos cargados</h3>
            <div className="form-grid">
              <Photo label="Foto del conductor" path={docs.fotoConductor} />
              <Photo label="Vehículo" path={docs.fotoVehiculo} />
              <Photo label="Cédula" path={docs.fotoCedula} />
              <Photo label="Licencia" path={docs.fotoLicencia} />
            </div>
          </div>
        )}
      </Modal>

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
