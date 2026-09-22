import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Pin, PinOff, Send, Trash2 } from 'lucide-react';
import { getAvisos, createAviso, pinAviso, deleteAviso } from '../../api/moderator';
import { tokenStore } from '../../api/axios';
import { SOCKET_URL } from '../../config';
import { errorMessage, formatDate, toList } from '../../utils/format';
import { Card, Input, Button, Badge, DataTable, ConfirmDialog, Toast, ToastContainer } from '../ui';
import './AvisosBoard.css';

const LABELS = {
  ciudad: { formLabel: 'Nuevo aviso para tu ciudad', emptyMessage: 'No hay avisos en tu ciudad' },
  admin: { formLabel: 'Publica un aviso general', emptyMessage: 'No hay avisos' },
};

const idOf = (a) => a?.id || a?._id;
const isPinned = (a) => Boolean(a?.fijado || a?.pinned);

export default function AvisosBoard({ variante = 'ciudad' }) {
  const { formLabel, emptyMessage } = LABELS[variante] || LABELS.ciudad;
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contenido, setContenido] = useState('');
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchAvisos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAvisos({ page: 1, limit: 50 });
      setAvisos(toList(res.data, 'avisos'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar avisos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAvisos(); }, [fetchAvisos]);

  // Refresco en tiempo real cuando llega un aviso nuevo.
  useEffect(() => {
    const token = tokenStore.access;
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
      // El servidor de producción aún lee el token desde el query del handshake.
      query: { token: `Bearer ${token}` },
    });
    socket.on('avisos:new_message', () => fetchAvisos());
    return () => { socket.disconnect(); };
  }, [fetchAvisos]);

  const showToast = (msg, ok = true) => setToast({ msg, ok });
  const closeToast = useCallback(() => setToast(null), []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!contenido.trim()) { showToast('Escribe el contenido del aviso', false); return; }
    setSaving(true);
    try {
      await createAviso({ contenido: contenido.trim() });
      setContenido('');
      showToast('Aviso publicado');
      fetchAvisos();
    } catch (err) {
      showToast(errorMessage(err, 'Error al publicar'), false);
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async () => {
    try {
      await pinAviso(idOf(action));
      showToast(action.fijado ? 'Aviso desfijado' : 'Aviso fijado');
      setAction(null);
      fetchAvisos();
    } catch (err) {
      showToast(errorMessage(err, 'Error'), false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAviso(idOf(action));
      showToast('Aviso eliminado');
      setAction(null);
      fetchAvisos();
    } catch (err) {
      showToast(errorMessage(err, 'Error al eliminar'), false);
    }
  };

  const columns = [
    {
      key: 'contenido',
      label: 'Contenido',
      render: (v, r) => {
        const text = v || r.contenido || '';
        return <span className="avisos__content truncate" title={text}>{text || '—'}</span>;
      },
    },
    {
      key: 'fijado',
      label: 'Fijado',
      render: (_, r) => (isPinned(r)
        ? <Badge variant="warning"><Pin size={11} /> Fijado</Badge>
        : <span className="text-muted">—</span>),
    },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap">{formatDate(v)}</span> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, r) => (
        <div className="row row--end" style={{ flexWrap: 'nowrap' }}>
          <Button
            size="sm"
            variant="soft-warning"
            icon={r.fijado ? <PinOff size={14} /> : <Pin size={14} />}
            onClick={() => setAction({ type: 'pin', ...r })}
          >
            {r.fijado ? 'Desfijar' : 'Fijar'}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setAction({ type: 'delete', ...r })} aria-label="Eliminar aviso">
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <form className="avisos__form" onSubmit={handleCreate}>
          <Input
            className="avisos__input"
            label={formLabel}
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="¡Buenos días a todos!"
          />
          <Button type="submit" loading={saving} icon={<Send size={14} />}>
            {saving ? 'Publicando…' : 'Publicar'}
          </Button>
        </form>
      </Card>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable columns={columns} data={avisos} loading={loading} emptyMessage={emptyMessage} />

      {toast && (
        <ToastContainer>
          <Toast message={toast.msg} variant={toast.ok ? 'success' : 'danger'} onClose={closeToast} duration={2500} />
        </ToastContainer>
      )}

      <ConfirmDialog
        isOpen={action?.type === 'pin'}
        onClose={() => setAction(null)}
        onConfirm={handlePin}
        title={action?.fijado ? 'Desfijar aviso' : 'Fijar aviso'}
        message={action?.fijado ? '¿Desfijar este aviso?' : '¿Fijar este aviso arriba?'}
        confirmText={action?.fijado ? 'Desfijar' : 'Fijar'}
      />
      <ConfirmDialog
        isOpen={action?.type === 'delete'}
        onClose={() => setAction(null)}
        onConfirm={handleDelete}
        title="Eliminar aviso"
        message="¿Eliminar este aviso? Se marcará como eliminado."
        confirmText="Eliminar"
        danger
      />
    </>
  );
}
