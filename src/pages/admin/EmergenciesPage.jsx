import { useState, useEffect, useMemo, useCallback } from 'react';
import { CircleCheck, Eye } from 'lucide-react';
import {
  getEmergencies, resolveEmergency, getTripById, getEmergencyChat, sendEmergencyMessage,
} from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, DataTable, ConfirmDialog, StatusBadge, Button, Badge, Textarea,
} from '../../components/ui';
import EmergencyDetailModal from './emergencies/EmergencyDetailModal';
import { shortId, userName, ruta, coords } from './emergencies/emergencyUtils';
import './emergencies/EmergenciesPage.css';

const POLL_MS = 20000;
const EMPTY_CHAT = { messages: [], loading: false, error: null };

export default function EmergenciesPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tripDetail, setTripDetail] = useState(null);
  const [chat, setChat] = useState(EMPTY_CHAT);
  const [confirm, setConfirm] = useState(null);
  const [notes, setNotes] = useState('');

  const fetchEmergencies = useCallback(async () => {
    try {
      setError(null);
      const res = await getEmergencies({ page: 1, limit: 100 });
      setEmergencies(toList(res.data, 'emergencies').map((e) => ({ ...e, status: e.atendida ? 'resolved' : 'pending' })));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las emergencias'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(fetchEmergencies, 0);
    const id = setInterval(fetchEmergencies, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [fetchEmergencies]);

  const pending = useMemo(() => emergencies.filter((e) => e.status === 'pending'), [emergencies]);
  const resolved = useMemo(() => emergencies.filter((e) => e.status === 'resolved'), [emergencies]);

  const openDetail = async (row) => {
    setDetail(row);
    setTripDetail(null);
    setChat({ messages: [], loading: true, error: null });
    if (row.viajeId) {
      try {
        const r = await getTripById(row.viajeId);
        setTripDetail(r.data?.data || r.data);
      } catch {
        // El detalle del viaje es opcional: el modal se muestra sin esa sección.
      }
    }
    try {
      const r = await getEmergencyChat(row.id);
      setChat({ messages: toList(r.data, 'messages'), loading: false, error: null });
    } catch (err) {
      setChat({ messages: [], loading: false, error: errorMessage(err, 'No se pudo cargar el chat') });
    }
  };

  const openConfirm = (row) => {
    setConfirm(row);
    setNotes('');
  };

  const closeConfirm = () => {
    setConfirm(null);
    setNotes('');
  };

  const handleResolve = async () => {
    if (!confirm) return;
    try {
      const nota = notes.trim();
      await resolveEmergency(confirm.id);
      try {
        await sendEmergencyMessage(confirm.id, `Emergencia resuelta por Admin CargaExpress${nota ? ` - ${nota}` : ''}`);
      } catch {
        // La constancia en el chat es opcional.
      }
      await fetchEmergencies();
    } catch (err) {
      setError(errorMessage(err, 'Error al resolver la emergencia'));
    }
  };

  const columns = [
    { key: 'id', label: 'ID', render: (val) => <span className="text-mono text-muted">#{shortId(val)}</span> },
    { key: 'usuario', label: 'Usuario', render: (_, row) => <span className="text-strong">{userName(row)}</span> },
    { key: 'viaje', label: 'Ruta', render: (_, row) => ruta(row) || '—' },
    { key: 'ubicacion', label: 'Ubicación', render: (_, row) => <span className="nowrap">{coords(row) || row.ubicacion || '—'}</span> },
    {
      key: 'status',
      label: 'Estado',
      render: (_, row) => (
        <StatusBadge
          status={row.status === 'resolved' ? 'resuelta' : 'abierta'}
          label={row.status === 'resolved' ? 'Resuelta' : 'Pendiente'}
        />
      ),
    },
    { key: 'createdAt', label: 'Fecha', render: (val) => <span className="text-muted nowrap">{formatDate(val)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          <Button
            size="sm"
            variant="ghost"
            icon={<Eye size={14} />}
            onClick={(e) => { e.stopPropagation(); openDetail(row); }}
          >
            Ver
          </Button>
          {row.status !== 'resolved' && (
            <Button
              size="sm"
              variant="soft-success"
              icon={<CircleCheck size={14} />}
              onClick={(e) => { e.stopPropagation(); openConfirm(row); }}
            >
              Resolver
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Emergencias" description="Alertas SOS activas y su historial de atención." />

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>Cerrar</Button>
        </div>
      )}

      <section className="emergency-section">
        <div className="emergency-section__head">
          <h3 className="emergency-section__title">Activas</h3>
          <Badge variant="danger">{pending.length} pendientes</Badge>
        </div>
        <DataTable
          columns={columns}
          data={pending}
          loading={loading}
          onRowClick={openDetail}
          emptyMessage="No hay emergencias activas"
          emptyDescription="Las nuevas alertas SOS aparecerán aquí automáticamente."
        />
      </section>

      <section className="emergency-section">
        <div className="emergency-section__head">
          <h3 className="emergency-section__title">Resueltas</h3>
          <Badge variant="success">{resolved.length} resueltas</Badge>
        </div>
        <DataTable
          columns={columns}
          data={resolved}
          loading={loading}
          onRowClick={openDetail}
          emptyMessage="Aún no hay emergencias resueltas"
        />
      </section>

      <EmergencyDetailModal
        emergency={detail}
        trip={tripDetail}
        chat={chat}
        onClose={() => setDetail(null)}
      />

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={closeConfirm}
        onConfirm={handleResolve}
        title="Resolver emergencia"
        message={`¿Deseas marcar la emergencia #${confirm ? shortId(confirm.id) : ''} como resuelta?`}
        confirmText="Resolver"
      >
        <Textarea
          label="Notas (opcional)"
          placeholder="Notas sobre la resolución…"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}
