import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { ArrowLeft, BellRing, Check, Flag, MessageSquare, X } from 'lucide-react';
import { getModeratorDriver, notifyDriver, reportDriver, approveDriver, rejectDriver } from '../../api/moderator';
import { errorMessage, formatCurrency, formatDate, formatDateTime, fullName } from '../../utils/format';
import { resolveStorageUrl } from '../../utils/storage';
import { faltantesDe, textoFaltantes } from '../../utils/documentos';
import { textoCanales } from '../../utils/canales';
import useDocumentosConductor from '../../hooks/useDocumentosConductor';
import NotificarDocumentosDialog from '../moderator/NotificarDocumentosDialog';
import { TarjetaPersona, Encuadre, posicionDe } from '../../components/panel';
import {
  PageHeader, Card, DataTable, ConfirmDialog, Avatar, Button, Badge, StatusBadge, LoadingState,
  Textarea, Toast, ToastContainer,
} from '../../components/ui';

// Claves viejas de `documentos` (camelCase) por si el servidor aún las manda así.
const LEGADO = { licencia: 'fotoLicencia', soat: 'fotoSoat', tecnomecanica: 'fotoTecnomecanica', tarjeta_propiedad: 'fotoTarjetaPropiedad', foto_vehiculo: 'fotoVehiculo', foto_conductor: 'fotoConductor' };
const PIN = L.divIcon({ className: '', html: '<div class="panel-pin panel-pin--on"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

// Un documento puede llegar como string (URL firmada) o como objeto {url, ruta}.
const docUrl = (d) => (typeof d === 'string' ? d : d?.url || d?.ruta || null);

function Documento({ label, path, extra }) {
  const url = resolveStorageUrl(path);
  return (
    <div className="perfil-doc">
      <span className="detail-list__label">{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${label} en una pestaña nueva`}>
          <img src={url} alt={label} className="perfil-doc__img" loading="lazy" />
        </a>
      ) : <span className="perfil-doc__vacio">Sin cargar</span>}
      {extra}
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

/** Perfil del conductor compartido. props: { area: 'admin'|'moderator' } */
export default function PerfilConductorPage({ area = 'moderator' }) {
  const { id } = useParams();
  const { documentos } = useDocumentosConductor();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [nota, setNota] = useState('');
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const esAdmin = area === 'admin';
  const volverA = esAdmin ? '/admin/drivers' : '/moderator/conductores';

  const fetchDriver = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModeratorDriver(id);
      setDriver(res.data);
    } catch (err) {
      const st = err.response?.status;
      if (st === 403) setError(err.response?.data?.message || 'Este conductor no pertenece a tu zona');
      else if (st === 404) setError(err.response?.data?.message || 'Conductor no encontrado');
      else setError(errorMessage(err, 'Error al cargar el perfil del conductor'));
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
  const notificar = async (data) => {
    try {
      const res = await notifyDriver(driver.id, data);
      showToast(textoCanales(res.data?.canales));
    } catch (err) { showToast(errorMessage(err, 'Error al notificar'), false); }
  };

  if (loading) return <div className="page"><LoadingState /></div>;
  if (error || !driver) {
    return (
      <div className="page">
        <PageHeader title="Perfil del conductor" actions={<Link className="btn btn--secondary btn--sm" to={volverA}><ArrowLeft size={14} /> Volver</Link>} />
        <div className="page-error" role="alert">{error || 'Conductor no encontrado'}</div>
      </div>
    );
  }

  const u = driver.usuario || {};
  const nombre = fullName(u);
  const pend = (driver.estadoVerificacion || 'pendiente') === 'pendiente';
  const docs = driver.documentos || {};
  const faltantes = faltantesDe(driver);
  const faltanDocs = faltantes.length > 0;
  const viajes = driver.viajes || [];
  const reportes = driver.reportes || [];
  const reportesMod = driver.reportesModerador || [];
  const disputas = driver.disputas || [];
  const ubicacion = posicionDe(driver.ultimaUbicacion);
  const foto = resolveStorageUrl(driver.fotoConductor || u.avatar);
  const docDe = (clave) => docs[clave] ?? docs[LEGADO[clave]];

  const viajeCols = [
    { key: 'id', label: 'Viaje', render: (v) => <Link className="text-mono text-strong" to={`/${area}/trips?viaje=${v}`}>#{v}</Link> },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'cliente', label: 'Cliente', render: (v) => (v ? <TarjetaPersona persona={v} tipo="cliente" area={area} size={24} /> : '—') },
    { key: 'origenDireccion', label: 'Origen', render: (v) => <span title={v}>{v || '—'}</span> },
    { key: 'destinoDireccion', label: 'Destino', render: (v) => <span title={v}>{v || '—'}</span> },
    { key: 'precioFinal', label: 'Precio', render: (v) => (v != null ? formatCurrency(v) : '—') },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDate(v)}</span> },
  ];
  const reporteCols = [
    { key: 'viajeId', label: 'Viaje', render: (v) => (v ? <Link className="text-mono" to={`/${area}/trips?viaje=${v}`}>#{v}</Link> : '—') },
    { key: 'motivo', label: 'Motivo', render: (v, r) => v || r.descripcion || '—' },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDate(v)}</span> },
  ];
  const disputaCols = [
    { key: 'id', label: 'Disputa', render: (v, r) => <Link className="text-mono text-strong" to={`/${area}/disputes?viaje=${r.viajeId}`}>#{v}</Link> },
    { key: 'viajeId', label: 'Viaje', render: (v) => <Link className="text-mono" to={`/${area}/trips?viaje=${v}`}>#{v}</Link> },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'resultado', label: 'Resultado', render: (v) => (v === 'favor_conductor' ? 'A favor del conductor' : v === 'favor_cliente' ? 'A favor del cliente' : '—') },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDate(v)}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Perfil del conductor"
        actions={<Link className="btn btn--secondary btn--sm" to={volverA}><ArrowLeft size={14} /> Volver</Link>}
      />

      <Card>
        <div className="perfil-cab">
          {foto ? <img src={foto} alt={nombre} className="perfil-cab__foto" /> : <Avatar name={nombre} size={112} />}
          <div className="perfil-cab__info">
            <h2 className="perfil-cab__nombre">{nombre}</h2>
            <span className="text-muted">{[driver.placa, driver.tipoVehiculo, driver.ciudad].filter(Boolean).join(' · ') || 'Conductor'}</span>
            <div className="perfil-cab__badges">
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
          <div className="perfil-cab__acciones">
            {u.id && (
              <Link className="btn btn--soft-primary btn--sm" to={`/${area}/conversations?usuario=${u.id}`}>
                <MessageSquare size={14} /> Chat
              </Link>
            )}
            <Button size="sm" variant="ghost" icon={<BellRing size={14} />} onClick={() => openAction('notify')}>Notificar</Button>
            {!esAdmin && <Button size="sm" variant="ghost" icon={<Flag size={14} />} onClick={() => openAction('report')}>Reportar</Button>}
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
        </div>
      </Card>

      <div className="two-col">
        <Card title="Datos personales">
          <div className="detail-list">
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

        <Card title="Ubicación">
          {ubicacion ? (
            <div className="stack">
              <div className="panel-mapa" style={{ height: 220 }}>
                <MapContainer center={ubicacion} zoom={14} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="&copy; OpenStreetMap" />
                  <Encuadre puntos={[ubicacion]} />
                  <Marker position={ubicacion} icon={PIN} />
                </MapContainer>
              </div>
              <span className="text-sm text-muted">Actualizada {formatDateTime(driver.ultimaUbicacion?.actualizadaEn)}</span>
            </div>
          ) : <p className="text-muted">Desconectado: sin ubicación</p>}
        </Card>
      </div>

      <Card title="Documentos">
        <div className="perfil-docs">
          {documentos.map(({ clave, etiqueta }) => {
            if (clave === 'numero_cedula') {
              return (
                <div key={clave} className="perfil-doc">
                  <span className="detail-list__label">{etiqueta}</span>
                  <span className="text-strong">{driver.cedula || u.cedula || <span className="text-muted">Sin registrar</span>}</span>
                </div>
              );
            }
            const vence = docs[`${clave}Vence`];
            const path = clave === 'foto_conductor' ? (docUrl(docDe(clave)) || driver.fotoConductor || u.avatar)
              : clave === 'foto_vehiculo' ? (docUrl(docDe(clave)) || driver.fotoVehiculo)
                : docUrl(docDe(clave));
            return (
              <Documento
                key={clave}
                label={etiqueta}
                path={path}
                extra={(
                  <>
                    {vence && <span className="text-xs text-muted">Vence {formatDate(vence)}</span>}
                    {clave === 'soat' && docs.excepcionSoatEstado && (
                      <span className="text-xs text-muted">Excepción: <StatusBadge status={docs.excepcionSoatEstado} /></span>
                    )}
                  </>
                )}
              />
            );
          })}
          {/* La foto de la cédula ya no se exige; se muestra solo si la subió antes. */}
          {docUrl(docs.fotoCedula) && <Documento label="Cédula (ya no se exige)" path={docUrl(docs.fotoCedula)} />}
        </div>
      </Card>

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
          onEnviar={notificar}
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
