import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModeratorDrivers } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { ciudadLabel, errorMessage, fullName, toList } from '../../utils/format';
import {
  PageHeader, SearchInput, SegmentedFilter, DataTable, Badge, StatusBadge, Pagination,
} from '../../components/ui';
import { CeldaConductor, CeldaVehiculo } from './driverCells';

const LIMIT = 50;
const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'rechazado', label: 'Rechazados' },
];

const driverName = (r) => fullName(r.usuario || r);

export default function DriverDirectoryPage() {
  const navigate = useNavigate();
  const { ciudadParams } = useModeratorCity();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModeratorDrivers({
        page, limit: LIMIT, estado: estado || undefined, buscar: q.trim() || undefined, ...ciudadParams,
      });
      setDrivers(toList(res.data, 'drivers'));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar los conductores'));
    } finally {
      setLoading(false);
    }
  }, [page, estado, q, ciudadParams]);

  useEffect(() => {
    const id = setTimeout(fetchDrivers, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetchDrivers, q]);

  const cambiarBusqueda = (v) => { setQ(v); setPage(1); };
  const cambiarEstado = (v) => { setEstado(v); setPage(1); };

  const columns = [
    {
      key: 'nombre',
      label: 'Conductor',
      render: (_, r) => <CeldaConductor r={r} name={driverName(r)} />,
    },
    { key: 'placa', label: 'Vehículo', render: (_, r) => <CeldaVehiculo r={r} /> },
    { key: 'telefono', label: 'Contacto', render: (_, r) => r.usuario?.telefono || '—' },
    { key: 'ciudad', label: 'Ciudad', render: (v) => ciudadLabel(v === 'california' ? 'cali' : v) },
    { key: 'estadoVerificacion', label: 'Estado', render: (v) => <StatusBadge status={v || 'pendiente'} /> },
    {
      key: 'online',
      label: 'Conexión',
      align: 'right',
      render: (v, r) => (r.usuario?.estadoCuenta === 'suspendida' || r.usuario?.suspendido
        ? <Badge variant="danger">Suspendido</Badge>
        : <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Conectado' : 'Desconectado'}</Badge>),
    },
  ];

  // El backend no manda el total: se ofrece "siguiente" mientras la página venga llena.
  const totalPages = page + (drivers.length === LIMIT ? 1 : 0);

  return (
    <div className="page">
      <PageHeader
        title="Directorio de conductores"
        description="Conductores de tu zona. Toca uno para ver su ficha completa: datos, vehículo, documentos, viajes y reportes."
      />

      <div className="toolbar">
        <SearchInput value={q} onChange={cambiarBusqueda} placeholder="Buscar por nombre, cédula o placa" />
        <SegmentedFilter options={ESTADOS} value={estado} onChange={cambiarEstado} ariaLabel="Estado de verificación" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        onRowClick={(r) => navigate(`/moderator/drivers/${r.id}`)}
        emptyMessage={q ? `Sin resultados para “${q}”` : 'No hay conductores en tu zona'}
      />

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
    </div>
  );
}
