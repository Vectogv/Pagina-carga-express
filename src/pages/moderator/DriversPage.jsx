import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check, FileText, Flag, X } from 'lucide-react';
import { getModeratorDrivers, notifyDriver, reportDriver, approveDriver, rejectDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import { resolveStorageUrl } from '../../utils/storage';
import { CeldaVehiculo } from './driverCells';
import { TarjetaPersona } from '../../components/panel';
import useDocumentosConductor from '../../hooks/useDocumentosConductor';
import { textoCanales } from '../../utils/canales';
import { faltantesDe, textoFaltantes } from '../../utils/documentos';
import NotificarDocumentosDialog from './NotificarDocumentosDialog';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, ConfirmDialog, Modal, Button, StatusBadge,
  Textarea, Toast, ToastContainer, Pagination, Badge,
} from '../../components/ui';

const TABS = [
  ['pendiente', 'Pendientes'],
  ['aprobado', 'Aprobados'],
  ['rechazado', 'Rechazados'],
  ['todos', 'Todos'],
];

const LIMIT = 20;
// Clave del documento (GET /api/config/documentos-conductor) -> campo con la foto en la fila del listado.
// SOAT, tecnomecánica y tarjeta de propiedad solo vienen en la ficha; aquí se muestra si falta o no.
const CAMPO_FOTO = {
  licencia: 'fotoLicencia',
  foto_vehiculo: 'fotoVehiculo',
  foto_conductor: 'fotoConductor',
};

const driverName = (r) => fullName(r.usuario || r);
const driverId = (r) => r.id || r.usuarioId;

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
  const { documentos } = useDocumentosConductor();
  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
      // Filtro, búsqueda y paginación en el servidor (?estado=&buscar=&page=&limit=).
      const res = await getModeratorDrivers({
        page, limit: LIMIT, estado: tab === 'todos' ? undefined : tab, buscar: filter.trim() || undefined, ...ciudadParams,
      });
      setDrivers(toList(res.data, 'drivers'));
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar conductores'));
    } finally {
      setLoading(false);
    }
  }, [page, tab, filter, ciudadParams]);

  useEffect(() => {
    const id = setTimeout(fetchDrivers, filter ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetchDrivers, filter]);
  const cambiarFiltro = (v) => { setFilter(v); setPage(1); };
  const cambiarTab = (v) => { setTab(v); setPage(1); };

  const showToast = (message, ok = true) => setToast({ message, variant: ok ? 'success' : 'danger' });
  const openAction = (type, r) => { setDocs(null); setNota(''); setAction({ type, ...r }); };
  const closeAction = () => { setAction(null); setNota(''); };

  const handleNotify = async (data) => {
    try {
      const res = await notifyDriver(driverId(action), data);
      showToast(textoCanales(res.data?.canales));
    } catch (err) { showToast(errorMessage(err, 'Error al notificar'), false); }
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
      render: (_, r) => <TarjetaPersona persona={r} tipo="conductor" area="moderator" size={40} />,
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

  const tabOptions = TABS.map(([value, label]) => ({ value, label, count: value === tab ? total : undefined }));
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const faltanDocs = docs ? faltantesDe(docs) : [];

  const actionEmail = action?.usuario?.email || '';

  return (
    <div className="page">
      <PageHeader title="Verificación de conductores" description="Verifica, notifica y reporta a los conductores de tu ciudad. Toca el nombre para abrir la ficha completa." />

      <div className="toolbar">
        <SearchInput value={filter} onChange={cambiarFiltro} placeholder="Buscar por nombre, cédula o placa" />
        <SegmentedFilter options={tabOptions} value={tab} onChange={cambiarTab} ariaLabel="Estado de verificación" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        emptyMessage={filter ? `Sin resultados para “${filter}”` : (tab === 'pendiente' ? 'Sin conductores pendientes' : 'No hay conductores en tu ciudad')}
        footer={totalPages > 1 ? <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} /> : null}
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
              {documentos.filter((d) => d.clave !== 'numero_cedula').map((d) => (CAMPO_FOTO[d.clave]
                ? <Photo key={d.clave} label={d.etiqueta} path={docs[CAMPO_FOTO[d.clave]]} />
                : (
                  <div key={d.clave} className="stack">
                    <span className="detail-list__label">{d.etiqueta}</span>
                    <Badge variant={faltanDocs.includes(d.clave) ? 'warning' : 'success'} size="sm">
                      {faltanDocs.includes(d.clave) ? 'Falta' : 'Cargado'}
                    </Badge>
                  </div>
                )))}
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
