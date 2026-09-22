import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban, Bell, Check, CircleCheck, Download, Eye, Flag, KeyRound, Pencil, Star, Trash2, UserPlus, X,
} from 'lucide-react';
import { getDrivers, resetPassword } from '../../api/admin';
import { errorMessage, toList } from '../../utils/format';
import {
  Alert, Avatar, Badge, Button, DataTable, PageHeader, Pagination, SearchInput, Select,
} from '../../components/ui';
import ResetPasswordModal from './users/ResetPasswordModal';
import DriverDetailModal from './drivers/DriverDetailModal';
import DriverEditModal from './drivers/DriverEditModal';
import DriverActionDialogs from './drivers/DriverActionDialogs';
import { ConnectionBadge, VerificationBadge } from './drivers/DriverBadges';
import {
  ciudadLabel, connectionKey, connectionLabel, driverName, driverUserId,
} from './drivers/driverUtils';
import { useZonas } from '../../hooks/useZonas';
import './users/users.css';

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'conectado', label: 'Conectado' },
  { value: 'desconectado', label: 'Desconectado' },
  { value: 'en_ruta', label: 'En ruta' },
  { value: 'pendiente', label: 'Verificación pendiente' },
  { value: 'aprobado', label: 'Verificado' },
];

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function DriversPage() {
  const ZONAS = useZonas();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pwDriver, setPwDriver] = useState(null);
  const [action, setAction] = useState(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDrivers({ page: 1, limit: 100, search });
      setDrivers(toList(res.data, 'drivers'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar conductores'));
    } finally {
      setLoading(false);
    }
  }, [search]);

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

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    const u = d.usuario || {};
    const matchesSearch = !q
      || `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || (u.telefono || '').includes(q)
      || (d.placa || '').toLowerCase().includes(q);
    const verif = d.estadoVerificacion || 'pendiente';
    const matchesStatus = filterStatus === 'all' || connectionKey(d) === filterStatus || verif === filterStatus;
    const matchesCity = !filterCity || String(d.ciudad || '').toLowerCase() === filterCity;
    return matchesSearch && matchesStatus && matchesCity;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const resetPage = (setter) => (value) => { setter(value); setPage(1); };

  const handleExport = () => {
    const header = ['Nombre', 'Email', 'Teléfono', 'Vehículo', 'Ciudad', 'Estado', 'Verificación'].join(',');
    const rows = filtered.map((d) => {
      const u = d.usuario || {};
      return [
        `${u.nombre || ''} ${u.apellido || ''}`,
        u.email,
        u.telefono,
        `${d.tipoVehiculo || ''} ${d.placa || ''}`,
        d.ciudad,
        connectionLabel(d),
        d.estadoVerificacion,
      ].map(csvCell).join(',');
    });
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conductores.csv';
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Exportado conductores.csv');
  };

  const handlePassword = async (password) => {
    await resetPassword(driverUserId(pwDriver), { password });
    setPwDriver(null);
    showNotice('Contraseña actualizada');
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Conductor',
      render: (_, d) => (
        <div className="cell-user">
          <Avatar src={d.fotoConductor} name={driverName(d)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{driverName(d)}</span>
            <span className="cell-user__meta">{d.usuario?.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'telefono', label: 'Teléfono', render: (_, d) => <span className="nowrap">{d.usuario?.telefono || '—'}</span> },
    {
      key: 'vehiculo',
      label: 'Vehículo',
      render: (_, d) => (
        <div className="cell-user__text">
          <span>{d.tipoVehiculo || '—'}</span>
          <span className="cell-user__meta">
            {d.placa ? `${d.placa} ` : ''}{d.capacidad ? `(${d.capacidad})` : ''}
          </span>
        </div>
      ),
    },
    { key: 'ciudad', label: 'Ciudad', render: (v) => (v ? <Badge variant="neutral">{ciudadLabel(v)}</Badge> : '—') },
    { key: 'estado', label: 'Estado', render: (_, d) => <ConnectionBadge driver={d} /> },
    { key: 'verificacion', label: 'Verificación', render: (_, d) => <VerificationBadge driver={d} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, d) => {
        const u = d.usuario || {};
        const name = driverName(d);
        const act = (type) => () => setAction({ type, driver: d });
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
            <Button size="icon" variant="ghost" onClick={() => setDetail(d)} aria-label={`Ver detalle de ${name}`} title="Ver detalle">
              <Eye size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(d)} aria-label={`Editar a ${name}`} title="Editar">
              <Pencil size={15} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setPwDriver(d)} aria-label={`Resetear contraseña de ${name}`} title="Resetear contraseña">
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
            <Button size="icon" variant="ghost" onClick={act('notify')} aria-label={`Notificar a ${name}`} title="Notificar">
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
        description="Gestión de conductores, su verificación, estado y cuenta."
        actions={(
          <>
            <Button variant="secondary" icon={<Download size={16} />} onClick={handleExport} disabled={!filtered.length}>
              Exportar CSV
            </Button>
            <Button icon={<UserPlus size={16} />} onClick={() => navigate('/admin/users')} title="Los conductores se crean desde Usuarios → Agregar">
              Añadir conductor
            </Button>
          </>
        )}
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Buscar por nombre, correo, teléfono o placa" />
        <Select className="inline-select" value={filterStatus} onChange={(e) => resetPage(setFilterStatus)(e.target.value)} aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select className="inline-select" value={filterCity} onChange={(e) => resetPage(setFilterCity)(e.target.value)} aria-label="Filtrar por ciudad">
          <option value="">Todas las ciudades</option>
          {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </Select>
      </div>

      {notice && <Alert variant={notice.variant} onClose={() => setNotice(null)}>{notice.msg}</Alert>}
      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        emptyMessage={search ? `Sin resultados para “${search}”` : 'No se encontraron conductores'}
        footer={(
          <div className="table-footer">
            <label className="rows-select">
              Filas por página
              <select value={rowsPerPage} onChange={(e) => resetPage(setRowsPerPage)(Number(e.target.value))}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
            <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} onChange={setPage} />
          </div>
        )}
      />

      {detail && <DriverDetailModal driver={detail} onClose={() => setDetail(null)} />}
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
          avatar={pwDriver.fotoConductor}
          onClose={() => setPwDriver(null)}
          onSubmit={handlePassword}
        />
      )}
      <DriverActionDialogs
        action={action}
        onClose={() => setAction(null)}
        onDone={(msg, { refresh }) => { showNotice(msg); if (refresh) fetchDrivers(); }}
        onError={(msg) => showNotice(msg, 'danger')}
      />
    </div>
  );
}
