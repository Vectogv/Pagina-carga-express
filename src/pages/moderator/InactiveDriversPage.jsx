import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { getInactiveDrivers, notifyDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatDate, fullName, toList } from '../../utils/format';
import {
  PageHeader, DataTable, ConfirmDialog, Avatar, Button, Badge, Toast, ToastContainer,
} from '../../components/ui';

const driverName = (r) => (r.usuario ? fullName(r.usuario) : (r.nombre || '—'));

export default function InactiveDriversPage() {
  const { ciudadParams } = useModeratorCity();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInactiveDrivers({ page: 1, limit: 50, ...ciudadParams });
      setDrivers(toList(res.data, 'drivers'));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar inactivos'));
    } finally {
      setLoading(false);
    }
  }, [ciudadParams]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleNotify = async () => {
    try {
      await notifyDriver(action.id || action.usuarioId);
      setToast({ message: 'Notificación enviada', variant: 'success' });
    } catch (err) {
      setToast({ message: errorMessage(err, 'Error al notificar'), variant: 'danger' });
    }
  };

  const columns = [
    {
      // Acciones primero: se ven sin desplazar la tabla en pantallas angostas.
      key: 'acciones',
      label: '',
      render: (_, r) => (
        <Button size="sm" variant="soft-primary" icon={<BellRing size={14} />} onClick={() => setAction(r)}>
          Notificar
        </Button>
      ),
    },
    {
      key: 'nombre',
      label: 'Conductor',
      render: (_, r) => (
        <div className="cell-user">
          <Avatar src={r.fotoConductor || r.usuario?.avatar} name={driverName(r)} />
          <div className="cell-user__text">
            <Link className="cell-user__name" to={`/moderator/drivers/${r.id}`}>{driverName(r)}</Link>
            <span className="cell-user__meta">{r.usuario?.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'ciudad', label: 'Ciudad', render: (v) => v || '—' },
    {
      key: 'ultimoViajeAt',
      label: 'Último viaje',
      // Solo conductores aprobados con más de 7 días sin viajes (el servidor ya excluye pendientes y recién registrados).
      render: (v) => (v ? <Badge variant="warning">{formatDate(v)}</Badge> : <Badge variant="neutral">Sin viajes</Badge>),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Conductores inactivos"
        description="Conductores aprobados de tu ciudad que llevan más de 7 días sin viajes y están desconectados. Envíales un recordatorio por notificación push."
      />

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        emptyMessage="No hay conductores inactivos"
        emptyDescription="Todos los conductores de tu ciudad han tenido actividad reciente."
      />

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
