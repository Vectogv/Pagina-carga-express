import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createComunicado, getModeratorComunicados } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatDate, toList } from '../../utils/format';
import {
  PageHeader, DataTable, Modal, Button, Input, Textarea, StatusBadge, Toast, ToastContainer,
} from '../../components/ui';

const EMPTY_FORM = { titulo: '', contenido: '' };

export default function ModeratorComunicadosPage() {
  const { ciudadParams } = useModeratorCity();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModeratorComunicados({ page: 1, limit: 50, ...ciudadParams });
      setList(toList(res.data, 'comunicados'));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar comunicados'));
    } finally {
      setLoading(false);
    }
  }, [ciudadParams]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const closeModal = () => { setOpen(false); setFormError(null); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) {
      setFormError('Completa título y contenido');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createComunicado({ titulo: form.titulo.trim(), contenido: form.contenido.trim() });
      setToast({ message: 'Comunicado creado. Queda pendiente de aprobación.', variant: 'success' });
      closeModal();
      setForm(EMPTY_FORM);
      fetchList();
    } catch (err) {
      setFormError(errorMessage(err, 'Error al crear'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'titulo', label: 'Título', render: (v) => <span className="text-strong">{v || '—'}</span> },
    { key: 'contenido', label: 'Contenido', render: (v) => <span className="truncate" style={{ display: 'inline-block', maxWidth: 320 }}>{v || '—'}</span> },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v || 'pendiente'} /> },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap">{formatDate(v)}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Comunicados"
        description="Mensajes para los conductores de tu ciudad. Quedan pendientes hasta que un administrador los apruebe."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Nuevo comunicado</Button>}
      />

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable columns={columns} data={list} loading={loading} emptyMessage="No has creado comunicados" />

      <Modal
        isOpen={open}
        onClose={closeModal}
        title="Nuevo comunicado"
        description="Se enviará a revisión antes de publicarse."
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="comunicado-form" loading={saving}>Crear comunicado</Button>
          </>
        )}
      >
        <form id="comunicado-form" onSubmit={handleCreate} className="stack">
          {formError && <div className="page-error" role="alert">{formError}</div>}
          <Input
            label="Título"
            required
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ej: Recordatorio operativo"
          />
          <Textarea
            label="Contenido"
            required
            value={form.contenido}
            onChange={(e) => setForm({ ...form, contenido: e.target.value })}
            placeholder="Mensaje para conductores de tu ciudad"
            rows={4}
          />
        </form>
      </Modal>

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
