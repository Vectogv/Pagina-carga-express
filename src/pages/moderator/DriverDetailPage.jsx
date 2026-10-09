import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, Check, Flag, MessageSquare, X } from 'lucide-react';
import { getModeratorDriver, notifyDriver, reportDriver, approveDriver, rejectDriver } from '../../api/moderator';
import { errorMessage, formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { resolveStorageUrl } from '../../utils/storage';
import { faltantesDe, textoFaltantes } from '../../utils/documentos';
import NotificarDocumentosDialog from './NotificarDocumentosDialog';
import {
  PageHeader, Card, DataTable, ConfirmDialog, Avatar, Button, Badge, StatusBadge, LoadingState,
  Textarea, Toast, ToastContainer,
} from '../../components/ui';

// Documentos con foto de la ficha (`documentos` del servidor): clave, etiqueta y clave del vencimiento.
const DOCS_FICHA = [
  ['fotoLicencia', 'Licencia de conducción'],
  ['fotoSoat', 'SOAT', 'soatVence'],
  ['fotoTecnomecanica', 'Tecnomecánica', 'tecnomecanicaVence'],
  ['fotoTarjetaPropiedad', 'Tarjeta de propiedad'],
];

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

// Un documento puede llegar como string (URL firmada) o como objeto {url, ruta}.
const docUrl = (d) => (typeof d === 'string' ? d : d?.url || d?.ruta || null);

export default function DriverDetailPage() {
  const { id } = useParams();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const fetchDriver = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModeratorDriver(id);
      setDriver(res.data);
    } catch (err) {
      const st = err.response?.status;
      if (st === 403) setError(err.response?.data?.message || 'Este conductor no pertenece a tu zona');
      else if (st === 404) setError(err.response?.data?.message || 'Conductor no encontrado (o el servidor aún no tiene la ficha)');
      else setError(errorMessage(err, 'Error al cargar la ficha del conductor'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDriver(); }, [fetchDriver]);

  const showToast = (message, ok = true) => setToast({ message, variant: ok ? 'success' : 'danger' });
  const openAction = (type) => { setNota(''); setAction(type); };
  const closeAction = () => { setAction(null); setNota(''); };
  const run = async (fn, okMsg, errMsg, recargar = false) => {
    try { await fn(); showToast(okMsg); if (recargar) fetchDriver(); } catch (err) { showToast(errorMessage(err, errMsg), false); }
  };

  if (loading) return <div className="page"><LoadingState /></div>;
  if (error || !driver) {
    return (
      <div className="page">
        <PageHeader title="Ficha del conductor" actions={<Link className="btn btn--secondary btn--sm" to="/moderator/conductores"><ArrowLeft size={14} /> Volver</Link>} />
        <div className="page-error" role="alert">{error || 'Conductor no encontrado'}</div>
      </div>
    );
  }

  const u = driver.usuario || {};
  const nombre = u.nombre || '—';
  const pend = (driver.estadoVerificacion || 'pendiente') === 'pendiente';
  const docs = driver.documentos || {};
  const faltantes = faltantesDe(driver);
  const faltanDocs = faltantes.length > 0;
  const viajes = driver.viajes || [];
  const reportes = driver.reportes || [];
  const reportesMod = driver.reportesModerador || [];
  const disputas = driver.disputas || [];

  const viajeCols = [
    { key: 'id', label: 'Viaje', render: (v) => <Link className="text-mono text-strong" to={`/moderator/trips?viaje=${v}`}>#{v}</Link> },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'origenDireccion', label: 'Origen', render: (v) => <span title={v}>{v || '—'}</span> },
    { key: 'destinoDireccion', label: 'Destino', render: (v) => <span title={v}>{v || '—'}</span> },
    { key: 'precioFinal', label: 'Precio', render: (v) => (v != null ? formatCurrency(v) : '—') },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDate(v)}</span> },
  ];
  const reporteCols = [
    { key: 'viajeId', label: 'Viaje', render: (v) => (v ? <Link className="text-mono" to={`/moderator/trips?viaje=${v}`}>#{v}</Link> : '—') },
    { key: 'motivo', label: 'Motivo', render: (v, r) => v || r.descripcion || '—' },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDate(v)}</span> },
  ];
  const disputaCols = [
    { key: 'id', label: 'Disputa', render: (v, r) => <Link className="text-mono text-strong" to={`/moderator/disputes?viaje=${r.viajeId}`}>#{v}</Link> },
    { key: 'viajeId', label: 'Viaje', render: (v) => <Link className="text-mono" to={`/moderator/trips?viaje=${v}`}>#{v}</Link> },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'resultado', label: 'Resultado', render: (v) => (v === 'favor_conductor' ? 'A favor del conductor' : v === 'favor_cliente' ? 'A favor del cliente' : '—') },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDate(v)}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        title={nombre}
        description={[driver.placa, driver.tipoVehiculo, driver.ciudad].filter(Boolean).join(' · ') || 'Conductor'}
        actions={(
          <div className="row">
            <Link className="btn btn--secondary btn--sm" to="/moderator/conductores"><ArrowLeft size={14} /> Directorio</Link>
            {u.id && (
              <Link className="btn btn--soft-primary btn--sm" to={`/moderator/conversations?usuario=${u.id}`}>
                <MessageSquare size={14} /> Chat
              </Link>
            )}
            <Button size="sm" variant="ghost" icon={<BellRing size={14} />} onClick={() => openAction('notify')}>Notificar</Button>
            <Button size="sm" variant="ghost" icon={<Flag size={14} />} onClick={() => openAction('report')}>Reportar</Button>
            {pend && (
              <Button
                size="sm"
                variant="soft-success"
                icon={<Check size={14} />}
                disabled={faltanDocs}
                title={faltanDocs ? textoFaltantes(faltantes) : undefined}
                onClick={() => openAction('approve')}
              >
                Aprobar
              </Button>
            )}
            {pend && <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => openAction('reject')}>Rechazar</Button>}
          </div>
        )}
      />

      <div className="row">
        <Avatar src={driver.fotoConductor || u.avatar} name={nombre} size={72} />
        <div className="stack">
          <div className="row">
            <StatusBadge status={driver.estadoVerificacion || 'pendiente'} />
            {(u.estadoCuenta === 'suspendida' || u.suspendido)
              ? <Badge variant="danger">Cuenta suspendida</Badge>
              : <Badge variant={driver.online ? 'success' : 'neutral'}>{driver.online ? 'Conectado' : 'Desconectado'}</Badge>}
            {u.tieneDeudaActiva && <Badge variant="warning">Deuda {formatCurrency(u.montoDeuda || 0)}</Badge>}
          </div>
          <span className="text-sm text-muted">
            Registrado {formatDate(driver.createdAt)}
            {driver.ultimaActividadAt ? ` · Última actividad ${formatDate(driver.ultimaActividadAt)}` : ''}
          </span>
          {pend && faltanDocs && <span className="text-sm text-warning">No se puede aprobar. {textoFaltantes(faltantes)}.</span>}
          {driver.notaRechazo && <span className="text-sm text-muted">Nota de rechazo: {driver.notaRechazo}</span>}
        </div>
      </div>

      <div className="two-col">
        <Card title="Datos personales">
          <div className="detail-list">
            <Detail label="Nombre">{nombre}</Detail>
            <Detail label="Número de cédula">{driver.cedula || u.cedula}</Detail>
            <Detail label="Teléfono">{u.telefono}</Detail>
            <Detail label="Correo">{u.email}</Detail>
            <Detail label="Edad">{u.edad}</Detail>
            <Detail label="Ciudad">{driver.ciudad}</Detail>
            <Detail label="Contacto de emergencia">
              {u.contactoEmergenciaNombre ? `${u.contactoEmergenciaNombre}${u.contactoEmergenciaTelefono ? ` · ${u.contactoEmergenciaTelefono}` : ''}` : null}
            </Detail>
          </div>
        </Card>

        <Card title="Vehículo">
          <div className="detail-list">
            <Detail label="Tipo">{driver.tipoVehiculo}</Detail>
            <Detail label="Placa">{driver.placa && <span className="text-mono">{driver.placa}</span>}</Detail>
            <Detail label="Capacidad">{driver.capacidad}</Detail>
            <Detail label="Modelo">{driver.modeloVehiculo}</Detail>
          </div>
          <Photo label="Foto del vehículo" path={driver.fotoVehiculo} />
        </Card>

        <Card title="Calificación y cuenta">
          <div className="detail-list">
            <Detail label="Calificación">{driver.calificacion != null ? `${Number(driver.calificacion).toFixed(1)} ★` : null}</Detail>
            <Detail label="Penalización por cancelar">{driver.penalizacionCancelacion ? `−${driver.penalizacionCancelacion}` : '0'}</Detail>
            <Detail label="Viajes">{driver.totalViajes ?? viajes.length}</Detail>
            <Detail label="Horas activo">{driver.horasActivo}</Detail>
            <Detail label="Deuda de comisión">{u.tieneDeudaActiva ? formatCurrency(u.montoDeuda || 0) : 'Al día'}</Detail>
            <Detail label="Estado de la cuenta">{u.estadoCuenta}</Detail>
          </div>
        </Card>

        <Card title="Documentos">
          <div className="form-grid">
            <Photo label="Foto del conductor" path={driver.fotoConductor || u.avatar} />
            {DOCS_FICHA.map(([k, label, venceKey]) => (
              <div key={k} className="stack">
                <Photo label={label} path={docUrl(docs[k])} />
                {venceKey && docs[venceKey] && <span className="text-sm text-muted">Vence {formatDate(docs[venceKey])}</span>}
                {k === 'fotoSoat' && docs.excepcionSoatEstado && (
                  <span className="text-sm text-muted">Excepción del SOAT: <StatusBadge status={docs.excepcionSoatEstado} /></span>
                )}
              </div>
            ))}
            {/* La foto de la cédula ya no se exige; se muestra solo si la subió antes. */}
            {docUrl(docs.fotoCedula) && <Photo label="Cédula (ya no se exige)" path={docUrl(docs.fotoCedula)} />}
          </div>
        </Card>
      </div>

      <Card title="Últimos viajes">
        <DataTable columns={viajeCols} data={viajes} emptyMessage="Sin viajes todavía" rowKey="id" />
      </Card>

      <div className="two-col">
        <Card title="Reportes de clientes">
          <DataTable columns={reporteCols} data={reportes} emptyMessage="Sin reportes" rowKey="id" />
        </Card>
        <Card title="Disputas">
          <DataTable columns={disputaCols} data={disputas} emptyMessage="Sin disputas" rowKey="id" />
        </Card>
      </div>

      {reportesMod.length > 0 && (
        <Card title="Reportes de moderadores al administrador">
          <div className="detail-list">
            {reportesMod.map((r) => (
              <Detail key={r.id} label={`${formatDateTime(r.createdAt)}${r.moderador ? ` · ${r.moderador}` : ''}`}>
                {r.descripcion} <StatusBadge status={r.estado} />
              </Detail>
            ))}
          </div>
        </Card>
      )}

      {action === 'notify' && (
        <NotificarDocumentosDialog
          onClose={closeAction}
          faltantes={faltantes}
          destinatario={u.email || nombre}
          onEnviar={(data) => run(() => notifyDriver(driver.id, data), 'Notificación enviada', 'Error al notificar')}
        />
      )}
      <ConfirmDialog
        isOpen={action === 'approve'}
        onClose={closeAction}
        onConfirm={() => run(() => approveDriver(driver.id), 'Conductor aprobado', 'Error al aprobar', true)}
        title="Aprobar conductor"
        message={`¿Confirmar la verificación de ${nombre}? Se notificará al conductor.`}
        confirmText="Aprobar"
      />
      <ConfirmDialog
        isOpen={action === 'reject'}
        onClose={closeAction}
        onConfirm={() => run(() => rejectDriver(driver.id, { nota: nota.trim() }), 'Conductor rechazado', 'Error al rechazar', true)}
        title="Rechazar conductor"
        message="La nota es obligatoria y se enviará al conductor."
        confirmText="Rechazar"
        confirmDisabled={!nota.trim()}
        danger
      >
        <Textarea label="Motivo del rechazo" required value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={action === 'report'}
        onClose={closeAction}
        onConfirm={() => run(() => reportDriver(driver.id, { descripcion: nota.trim() }), 'Reporte enviado al administrador', 'Error al reportar', true)}
        title="Reportar al administrador"
        message="El reporte será visible para el administrador en Reportes de moderadores."
        confirmText="Reportar"
        confirmDisabled={!nota.trim()}
        danger
      >
        <Textarea label="Descripción" required value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Inactivo 2 semanas, no responde" rows={3} />
      </ConfirmDialog>

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
