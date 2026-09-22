import { useState, useEffect, useCallback } from 'react';
import { BellRing } from 'lucide-react';
import { getInactiveDrivers, notifyDriver } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, fullName, toList } from '../../utils/format';
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
      key: 'nombre',
      label: 'Conductor',
      render: (_, r) => (
        <div className="cell-user">
          <Avatar src={r.usuario?.avatar} name={driverName(r)} />
          <div className="cell-user__text">
            <span className="cell-user__name">{driverName(r)}</span>
            <span className="cell-user__meta">{r.usuario?.email || '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'ciudad', label: 'Ciudad', render: (v) => v || '—' },
    {
      key: 'dias',
      label: 'Inactividad',
      render: (_, r) => {
        const d = r.diasInactivo ?? r.dias;
        return <Badge variant="warning">{d != null ? `${d} días` : '7+ días'}</Badge>;
      },
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, r) => (
        <Button size="sm" variant="soft-primary" icon={<BellRing size={14} />} onClick={() => setAction(r)}>
          Notificar
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Conductores inactivos"
        description="Conductores con 7 o más días sin viajes y desconectados en tu ciudad. Envíales un recordatorio por notificación push."
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
