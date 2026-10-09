import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban, Bell, Check, CircleCheck, Download, Eye, Flag, KeyRound, Pencil, Star, Trash2, UserPlus, X,
} from 'lucide-react';
import { getDrivers, resetPassword, notifyDriver } from '../../api/admin';
import { errorMessage, toList } from '../../utils/format';
import { faltantesDe } from '../../utils/documentos';
import { descargarCsv } from '../../utils/csv';
import {
  Alert, Badge, Button, DataTable, PageHeader, Pagination, SearchInput, Select, Toast, ToastContainer,
} from '../../components/ui';
import { FiltroZona, TarjetaPersona } from '../../components/panel';
import NotificarDocumentosDialog from '../moderator/NotificarDocumentosDialog';
import ResetPasswordModal from './users/ResetPasswordModal';
import { paginacionDe } from './users/constants';
import DriverEditModal from './drivers/DriverEditModal';
import DriverActionDialogs from './drivers/DriverActionDialogs';
import { ConnectionBadge, VerificationBadge } from './drivers/DriverBadges';
import { ciudadLabel, connectionLabel, driverName, driverUserId } from './drivers/driverUtils';
import { textoCanales } from '../../utils/canales';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import './users/users.css';

const LIMIT = 20;

// GET /api/admin/drivers filtra por `online=1` (solo conectados) y `estado` (verificación).
// No hay filtro "desconectado" en el servidor: no se ofrece.
const STATUS_FILTERS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'conectado', label: 'Conectado' },
  { value: 'pendiente', label: 'Verificación pendiente' },
  { value: 'aprobado', label: 'Verificado' },
  { value: 'rechazado', label: 'Verificación rechazada' },
];

export default function DriversPage() {
  const zonas = useZonas();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [zona, setZona] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: undefined, totalPages: 1 });

  const [editing, setEditing] = useState(null);
  const [pwDriver, setPwDriver] = useState(null);
  const [notifying, setNotifying] = useState(null);
  const [action, setAction] = useState(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDrivers({
        page,
        limit: LIMIT,
        search: search.trim() || undefined,
        zona: zona || undefined,
        online: filterStatus === 'conectado' ? 1 : undefined,
        estado: ['pendiente', 'aprobado', 'rechazado'].includes(filterStatus) ? filterStatus : undefined,
      });
      const rows = toList(res.data, 'drivers');
      setDrivers(rows);
      setPagination(paginacionDe(res.headers, rows.length, page, LIMIT));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar conductores'));
    } finally {
      setLoading(false);
    }
  }, [page, search, zona, filterStatus]);

  useEffect(() => {
    const t = setTimeout(fetchDrivers, 300);
    return () => clearTimeout(t);
  }, [fetchDrivers]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const showNotice = (msg, variant = 'success') => setNotice({ msg, variant });
  const resetPage = (setter) => (value) => { setter(value); setPage(1); };

  // Solo exporta la página actual: el servidor no tiene exportación y no se cargan todas las páginas.
  const handleExport = () => {
    const rows = drivers.map((d) => {
      const u = d.usuario || {};
      return [driverName(d), u.email, u.telefono, `${d.tipoVehiculo || ''} ${d.placa || ''}`, d.ciudad, connectionLabel(d), d.estadoVerificacion];
    });
    descargarCsv('conductores.csv', ['Nombre', 'Email', 'Teléfono', 'Vehículo', 'Ciudad', 'Estado', 'Verificación'], rows);
    showNotice(`Exportado conductores.csv (${rows.length} de esta página)`);
  };

  const handlePassword = async (password) => {
    await resetPassword(driverUserId(pwDriver), { password });
    setPwDriver(null);
    showNotice('Contraseña actualizada');
  };

  const handleNotify = async (data) => {
    const d = notifying;
    setNotifying(null);
    try {
      const res = await notifyDriver(d.id, data || {});
      const body = res.data?.data || res.data;
      const canales = body?.canales || { bandeja: true, push: !!body?.push };
      setToast({ msg: textoCanales(canales), variant: canales.push === false || canales.correo === false ? 'warning' : 'success' });
    } catch (err) {
      setToast({ msg: errorMessage(err, 'No se pudo notificar'), variant: 'danger' });
    }
  };

  const columns = [
    { key: 'nombre', label: 'Conductor', render: (_, d) => <TarjetaPersona persona={d} tipo="conductor" area="admin" /> },
    { key: 'telefono', label: 'Teléfono', render: (_, d) => <span className="nowrap">{d.usuario?.telefono || '—'}</span> },
    { key: 'email', label: 'Correo', render: (_, d) => d.usuario?.email || '—' },
    { key: 'ciudad', label: 'Zona', render: (v) => (v ? <Badge variant="neutral">{zonaLabelFrom(zonas, v) || ciudadLabel(v)}</Badge> : '—') },
    { key: 'estado', label: 'Estado', render: (_, d) => <ConnectionBadge driver={d} /> },
    { key: 'verificacion', label: 'Verificación', render: (_, d) => <VerificationBadge driver={d} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, d) => {
        const u = d.usuario || {};
        const name = driverName(d);
        const act = (type) => (e) => { e.stopPropagation(); setAction({ type, driver: d }); };
        const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
        return (
          <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
            {d.estadoVerificacion === 'pendiente' && (
              <>
                <Button size="icon" variant="soft-success" onClick={act('approve')} aria-label={`Aprobar a ${name}`} title="Aprobar verificación">
                  <Check size={15} />
                </Button>
                <Button size="icon" variant="soft-danger" onClick={act('reject')} aria-label={`Rechazar a ${name}`} title="Rechazar verificación">
                  <X size={15} />
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" onClick={stop(() => navigate(`/admin/drivers/${d.id}`))} aria-label={`Ver perfil de ${name}`} title="Ver perfil">
              <Eye size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={stop(() => setEditing(d))} aria-label={`Editar a ${name}`} title="Editar">
              <Pencil size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={stop(() => setPwDriver(d))} aria-label={`Resetear contraseña de ${name}`} title="Resetear contraseña">
              <KeyRound size={15} />
            </Button>
            <Button
              size="icon"
              variant={u.suspendido ? 'soft-success' : 'ghost'}
              onClick={act('suspend')}
              aria-label={u.suspendido ? `Activar a ${name}` : `Suspender a ${name}`}
              title={u.suspendido ? 'Activar' : 'Suspender'}
            >
              {u.suspendido ? <CircleCheck size={15} /> : <Ban size={15} />}
            </Button>
            <Button
              size="icon"
              variant={u.esLider ? 'soft-warning' : 'ghost'}
              onClick={act('leader')}
              aria-label={u.esLider ? `Quitar líder a ${name}` : `Marcar a ${name} como líder`}
              aria-pressed={!!u.esLider}
              title={u.esLider ? 'Quitar líder' : 'Hacer líder'}
            >
              <Star size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={stop(() => setNotifying(d))} aria-label={`Notificar a ${name}`} title="Notificar">
              <Bell size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={act('report')} aria-label={`Reportar a ${name}`} title="Reportar">
              <Flag size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={act('delete')} aria-label={`Eliminar a ${name}`} title="Eliminar">
              <Trash2 size={15} />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Conductores"
        description="Conductores registrados: conexión, verificación de documentos y acciones sobre su cuenta. Toca el nombre o la fila para abrir su perfil."
        actions={(
          <>
            <Button variant="secondary" icon={<Download size={16} />} onClick={handleExport} disabled={!drivers.length}>
              Exportar CSV
            </Button>
            <Button icon={<UserPlus size={16} />} onClick={() => navigate('/admin/users')} title="Los conductores se crean desde Usuarios → Agregar">
              Añadir conductor
            </Button>
          </>
        )}
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Buscar por nombre, correo, teléfono, cédula o placa" />
        <Select className="inline-select" value={filterStatus} onChange={(e) => resetPage(setFilterStatus)(e.target.value)} aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <FiltroZona value={zona} onChange={resetPage(setZona)} />
      </div>

      {notice && <Alert variant={notice.variant} onClose={() => setNotice(null)}>{notice.msg}</Alert>}
      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        onRowClick={(d) => navigate(`/admin/drivers/${d.id}`)}
        emptyMessage={search ? `Sin resultados para “${search}”` : 'No se encontraron conductores'}
        emptyDescription={zona || filterStatus !== 'all' ? 'Prueba con otra zona o estado.' : undefined}
        footer={<Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />}
      />

      {editing && (
        <DriverEditModal
          driver={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); showNotice('Conductor actualizado'); fetchDrivers(); }}
        />
      )}
      {pwDriver && (
        <ResetPasswordModal
          name={driverName(pwDriver)}
          email={pwDriver.usuario?.email || pwDriver.usuarioId}
          avatar={pwDriver.fotoConductor || pwDriver.avatar}
          onClose={() => setPwDriver(null)}
          onSubmit={handlePassword}
        />
      )}
      {notifying && (
        <NotificarDocumentosDialog
          onClose={() => setNotifying(null)}
          faltantes={faltantesDe(notifying)}
          destinatario={notifying.usuario?.email || driverName(notifying)}
          onEnviar={handleNotify}
        />
      )}
      <DriverActionDialogs
        action={action}
        onClose={() => setAction(null)}
        onDone={(msg, { refresh }) => { showNotice(msg); if (refresh) fetchDrivers(); }}
        onError={(msg) => showNotice(msg, 'danger')}
      />
      {toast && (
        <ToastContainer>
          <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} duration={6000} />
        </ToastContainer>
      )}
    </div>
  );
}
