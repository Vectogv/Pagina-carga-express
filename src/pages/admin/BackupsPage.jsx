import { useState, useEffect, useCallback } from 'react';
import { Clock, DatabaseBackup, Plus, RefreshCw } from 'lucide-react';
import { getBackups, runBackup } from '../../api/admin';
import { errorMessage, formatBytes, formatDateTime, toList } from '../../utils/format';
import {
  PageHeader, DataTable, Badge, Button, StatCard, Toast, ToastContainer,
} from '../../components/ui';

const STATUS_VARIANT = {
  completado: 'success', completed: 'success', exitoso: 'success', success: 'success',
  pendiente: 'warning', pending: 'warning', 'en progreso': 'warning', running: 'warning',
  error: 'danger', fallido: 'danger', failed: 'danger',
};

const statusOf = (b) => b.status || b.estado || '';
const dateOf = (b) => b.createdAt || b.fecha || b.date;

const columns = [
  {
    key: 'id',
    label: 'ID',
    render: (_, b) => <span className="text-mono text-muted">{String(b.id || b._id || '—').slice(0, 8)}</span>,
  },
  { key: 'createdAt', label: 'Fecha', render: (_, b) => <span className="nowrap">{formatDateTime(dateOf(b))}</span> },
  {
    key: 'size',
    label: 'Tamaño',
    align: 'right',
    render: (_, b) => {
      const size = b.size || b.tamano;
      return size ? formatBytes(size) : '—';
    },
  },
  {
    key: 'status',
    label: 'Estado',
    render: (_, b) => {
      const s = statusOf(b);
      const variant = STATUS_VARIANT[s.toLowerCase()] || 'neutral';
      return (
        <Badge variant={variant}>
          <span className="badge__dot" aria-hidden="true" />
          {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Desconocido'}
        </Badge>
      );
    },
  },
];

export default function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBackups();
      setBackups(toList(res.data, 'backups'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar los backups'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const closeToast = useCallback(() => setToast(null), []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await runBackup();
      setToast({ message: 'Backup creado exitosamente', variant: 'success' });
      await fetchBackups();
    } catch (err) {
      setToast({ message: errorMessage(err, 'Error al crear el backup'), variant: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  const latest = backups.reduce((acc, b) => {
    const d = dateOf(b);
    return d && (!acc || new Date(d) > new Date(acc)) ? d : acc;
  }, null);

  return (
    <div className="page">
      <PageHeader
        title="Backups"
        description="Copias de seguridad de la base de datos del sistema."
        actions={(
          <>
            <Button variant="secondary" size="icon" onClick={fetchBackups} disabled={loading} aria-label="Actualizar lista">
              <RefreshCw size={15} />
            </Button>
            <Button icon={<Plus size={15} />} onClick={handleCreateBackup} loading={creating}>
              {creating ? 'Creando...' : 'Crear backup'}
            </Button>
          </>
        )}
      />

      <div className="stats-grid">
        <StatCard title="Backups registrados" value={loading ? '—' : backups.length} icon={<DatabaseBackup size={16} />} color="var(--primary)" />
        <StatCard title="Último backup" value={loading ? '—' : formatDateTime(latest)} icon={<Clock size={16} />} color="var(--success)" />
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchBackups}>Reintentar</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={backups}
        loading={loading}
        rowKey={(b, i) => b.id || b._id || i}
        emptyMessage="No hay backups registrados"
        emptyDescription="Crea el primer backup con el botón superior."
      />

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
