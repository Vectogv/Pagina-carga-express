import { useState, useEffect, useCallback } from 'react';
import { BellRing } from 'lucide-react';
import { getInactiveDrivers, notifyDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import {
  PageHeader, DataTable, ConfirmDialog, Button, Badge, Toast, ToastContainer, Pagination,
} from '../../components/ui';
import { CeldaVehiculo } from './driverCells';
import { TarjetaPersona } from '../../components/panel';
import { textoCanales } from '../../utils/canales';

const LIMIT = 50;
const driverName = (r) => (r.usuario ? fullName(r.usuario) : (r.nombre || '—'));

export default function InactiveDriversPage() {
  const { ciudadParams } = useModeratorCity();
  const zonas = useZonas();
  const [drivers, setDrivers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dias, setDias] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInactiveDrivers({ page, limit: LIMIT, ...ciudadParams });
      setDrivers(toList(res.data, 'drivers'));
      setTotal(res.data?.total ?? 0);
      setDias(res.data?.inactividadDias ?? null);
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar inactivos'));
    } finally {
      setLoading(false);
    }
  }, [page, ciudadParams]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleNotify = async () => {
    try {
      const res = await notifyDriver(action.id || action.usuarioId);
      setToast({ message: textoCanales(res.data?.canales), variant: 'success' });
    } catch (err) {
      setToast({ message: errorMessage(err, 'Error al notificar'), variant: 'danger' });
    }
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Conductor',
      render: (_, r) => <TarjetaPersona persona={r} tipo="conductor" area="moderator" size={40} />,
    },
    { key: 'placa', label: 'Vehículo', render: (_, r) => <CeldaVehiculo r={r} /> },
    { key: 'telefono', label: 'Contacto', render: (_, r) => r.usuario?.telefono || '—' },
    { key: 'ciudad', label: 'Ciudad', render: (v) => zonaLabelFrom(zonas, v) },
    {
      key: 'ultimoViajeAt',
      label: 'Último viaje',
      // Solo conductores aprobados sin viajes en el umbral que fija gerencia (el servidor ya excluye pendientes y recién registrados).
      render: (v) => (v ? <Badge variant="warning">{formatDate(v)}</Badge> : <Badge variant="neutral">Sin viajes</Badge>),
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, r) => (
        <div className="acciones-fila">
          <div className="acciones-fila__botones">
            <Button size="sm" variant="soft-primary" icon={<BellRing size={14} />} onClick={() => setAction(r)}>
              Notificar
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Conductores inactivos"
        description={`Conductores aprobados de tu ciudad desconectados y sin actividad hace ${dias ? `más de ${dias} días` : 'más días de los permitidos'} (umbral configurable por gerencia). Envíales un recordatorio.`}
      />

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        emptyMessage="No hay conductores inactivos"
        emptyDescription="Todos los conductores de tu ciudad han tenido actividad reciente."
      />

      {total > LIMIT && <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} onChange={setPage} />}

      <ConfirmDialog
        isOpen={!!action}
        onClose={() => setAction(null)}
        onConfirm={handleNotify}
        title="Notificar conductor inactivo"
        message={`Se enviará un recordatorio a ${action ? driverName(action) : ''}${action?.usuario?.email ? ` (${action.usuario.email})` : ''}.`}
        confirmText="Notificar"
      />

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
