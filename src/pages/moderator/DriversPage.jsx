import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check, FileText, Flag, X } from 'lucide-react';
import { getModeratorDrivers, notifyDriver, reportDriver, approveDriver, rejectDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import { resolveStorageUrl } from '../../utils/storage';
import { CeldaConductor, CeldaVehiculo } from './driverCells';
import { faltantesDe, textoFaltantes } from '../../utils/documentos';
import NotificarDocumentosDialog from './NotificarDocumentosDialog';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, ConfirmDialog, Modal, Button, StatusBadge,
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
  const zonas = useZonas();
  // Una petición por estado: así cada pestaña tiene su propio conteo aunque se
  // esté viendo otra (el backend filtra y pagina por estado; el conteo sale de `total`).
  const [byEstado, setByEstado] = useState(EMPTY_BY_ESTADO);
  const [totales, setTotales] = useState({});
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
      const tot = {};
      ESTADOS.forEach((estado, i) => {
        next[estado] = toList(responses[i].data, 'drivers');
        tot[estado] = responses[i].data?.total ?? next[estado].length;
      });
      setByEstado(next);
      setTotales(tot);
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

  const handleNotify = async (data) => {
    try { await notifyDriver(driverId(action), data); showToast('Notificación enviada'); } catch (err) { showToast(errorMessage(err, 'Error al notificar'), false); }
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

  // Sin los 6 documentos y el número de cédula no se puede aprobar (el botón queda deshabilitado con el motivo).
  const motivoBloqueo = (r) => textoFaltantes(faltantesDe(r));

  const columns = [
    {
      key: 'nombre',
      label: 'Conductor',
      render: (_, r) => <CeldaConductor r={r} name={driverName(r)} to={`/moderator/drivers/${r.id}`} />,
    },
    { key: 'placa', label: 'Vehículo', render: (_, r) => <CeldaVehiculo r={r} /> },
    { key: 'telefono', label: 'Contacto', render: (_, r) => r.usuario?.telefono || '—' },
    { key: 'ciudad', label: 'Ciudad', render: (v) => zonaLabelFrom(zonas, v) },
    { key: 'estadoVerificacion', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, r) => {
        const pend = (r.estadoVerificacion || 'pendiente') === 'pendiente';
        const bloqueado = pend ? motivoBloqueo(r) : '';
        return (
          <div className="acciones-fila">
            <div className="acciones-fila__botones">
              {pend && (
                <>
                  <Button size="sm" variant="soft-success" icon={<Check size={14} />} disabled={!!bloqueado} title={bloqueado || undefined} onClick={() => openAction('approve', r)}>
                    Aprobar
                  </Button>
                  <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => openAction('reject', r)}>Rechazar</Button>
                  <span className="acciones-fila__sep" aria-hidden="true" />
                </>
              )}
              <Button size="icon" variant="ghost" onClick={() => setDocs(r)} aria-label={`Ver documentos de ${driverName(r)}`} title="Ver documentos">
                <FileText size={15} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => openAction('notify', r)} aria-label={`Notificar a ${driverName(r)}`} title="Notificar">
                <BellRing size={15} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => openAction('report', r)} aria-label={`Reportar a ${driverName(r)}`} title="Reportar al administrador">
                <Flag size={15} />
              </Button>
            </div>
            {bloqueado && <span className="acciones-fila__aviso">{bloqueado}</span>}
          </div>
        );
      },
    },
  ];

  const drivers = tab === 'todos'
    ? ESTADOS.flatMap((e) => byEstado[e]).sort(byNewest)
    : byEstado[tab] || [];
  const counts = {
    pendiente: totales.pendiente ?? 0,
    aprobado: totales.aprobado ?? 0,
    rechazado: totales.rechazado ?? 0,
    todos: ESTADOS.reduce((acc, e) => acc + (totales[e] ?? 0), 0),
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
      <PageHeader title="Verificación de conductores" description="Verifica, notifica y reporta a los conductores de tu ciudad. Toca el nombre para abrir la ficha completa." />

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
                <Button
                  variant="soft-success"
                  icon={<Check size={14} />}
                  disabled={!!motivoBloqueo(docs)}
                  title={motivoBloqueo(docs) || undefined}
                  onClick={() => openAction('approve', docs)}
                >
                  Aprobar
                </Button>
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
              <Detail label="Número de cédula">{docs.cedula}</Detail>
              {motivoBloqueo(docs) && <Detail label="Para aprobar"><span className="text-warning">{motivoBloqueo(docs)}</span></Detail>}
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
              <Photo label="Licencia" path={docs.fotoLicencia} />
              {/* La foto de la cédula ya no se exige; se muestra solo si la subió antes. */}
              {docs.fotoCedula && <Photo label="Cédula (ya no se exige)" path={docs.fotoCedula} />}
            </div>
          </div>
        )}
      </Modal>

      {action?.type === 'notify' && (
        <NotificarDocumentosDialog
          onClose={closeAction}
          faltantes={faltantesDe(action)}
          destinatario={actionEmail || driverName(action)}
          onEnviar={handleNotify}
        />
      )}
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
