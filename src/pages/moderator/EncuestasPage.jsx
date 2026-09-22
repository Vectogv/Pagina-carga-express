import { useState, useEffect, useCallback } from 'react';
import { ChartColumn, Plus, X } from 'lucide-react';
import { createEncuesta, getEncuestaResults, getMyEncuestas } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatNumber, toList } from '../../utils/format';
import {
  PageHeader, DataTable, Modal, Button, Input, StatusBadge, Toast, ToastContainer,
} from '../../components/ui';
import './EncuestasPage.css';

const EMPTY_FORM = { pregunta: '', opciones: ['', ''], fechaCierre: '' };

/** Intenta leer los resultados como [{label, votos}]; el formato del backend no está fijado. */
function parseResults(data) {
  const src = data?.data && !Array.isArray(data.data) ? data.data : data;
  const arr = toList(src, 'resultados', 'opciones', 'results', 'votos');
  const rows = arr.map((o) => {
    if (typeof o !== 'object' || o === null) return null;
    const label = o.opcion ?? o.texto ?? o.label ?? o.nombre ?? o.option;
    const votos = o.votos ?? o.count ?? o.total ?? o.cantidad ?? o.respuestas;
    if (label === undefined || typeof votos !== 'number') return null;
    return { label: String(label), votos };
  });
  if (!rows.length || rows.some((r) => !r)) return null;
  const total = rows.reduce((acc, r) => acc + r.votos, 0);
  return { rows, total, pregunta: src?.pregunta };
}

export default function ModeratorEncuestasPage() {
  const { ciudadParams } = useModeratorCity();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyEncuestas({ page: 1, limit: 50, ...ciudadParams });
      setList(toList(res.data, 'encuestas'));
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar encuestas'));
    } finally {
      setLoading(false);
    }
  }, [ciudadParams]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const closeModal = () => { setOpen(false); setFormError(null); };
  const setOption = (i, value) => {
    const opciones = [...form.opciones];
    opciones[i] = value;
    setForm({ ...form, opciones });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const opciones = form.opciones.map((o) => o.trim()).filter(Boolean);
    if (!form.pregunta.trim() || opciones.length < 2) {
      setFormError('Escribe la pregunta y al menos 2 opciones');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { pregunta: form.pregunta.trim(), opciones };
      if (form.fechaCierre) payload.fechaCierre = form.fechaCierre;
      await createEncuesta(payload);
      setToast({ message: 'Encuesta creada. Queda pendiente de aprobación.', variant: 'success' });
      closeModal();
      setForm(EMPTY_FORM);
      fetchList();
    } catch (err) {
      setFormError(errorMessage(err, 'Error al crear'));
    } finally {
      setSaving(false);
    }
  };

  const handleResults = async (row) => {
    try {
      const res = await getEncuestaResults(row.id || row._id);
      setResults({ encuesta: row, data: res.data });
    } catch (err) {
      setToast({ message: errorMessage(err, 'No se pudieron cargar los resultados'), variant: 'danger' });
    }
  };

  const columns = [
    { key: 'pregunta', label: 'Pregunta', render: (v, r) => <span className="text-strong">{v || r.titulo || '—'}</span> },
    { key: 'opciones', label: 'Opciones', render: (v) => `${(v || []).length} opciones` },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v || 'pendiente'} /> },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, r) => (
        <Button size="sm" variant="soft-primary" icon={<ChartColumn size={14} />} onClick={() => handleResults(r)}>
          Resultados
        </Button>
      ),
    },
  ];

  const parsed = results ? parseResults(results.data) : null;

  return (
    <div className="page">
      <PageHeader
        title="Encuestas"
        description="Encuestas para los conductores de tu ciudad. Quedan pendientes hasta que un administrador las apruebe."
        actions={<Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Nueva encuesta</Button>}
      />

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable columns={columns} data={list} loading={loading} emptyMessage="No hay encuestas" />

      <Modal
        isOpen={open}
        onClose={closeModal}
        title="Nueva encuesta"
        description="Se enviará a revisión antes de publicarse."
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="encuesta-form" loading={saving}>Crear encuesta</Button>
          </>
        )}
      >
        <form id="encuesta-form" onSubmit={handleCreate} className="stack">
          {formError && <div className="page-error" role="alert">{formError}</div>}
          <Input
            label="Pregunta"
            required
            value={form.pregunta}
            onChange={(e) => setForm({ ...form, pregunta: e.target.value })}
            placeholder="Ej: ¿Qué horario prefieres?"
          />
          {form.opciones.map((op, i) => (
            <div key={i} className="poll-option">
              <Input
                label={`Opción ${i + 1}`}
                value={op}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Opción ${i + 1}`}
              />
              {form.opciones.length > 2 && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Quitar opción ${i + 1}`}
                  onClick={() => setForm({ ...form, opciones: form.opciones.filter((_, idx) => idx !== i) })}
                >
                  <X size={15} />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => setForm({ ...form, opciones: [...form.opciones, ''] })}>
            Agregar opción
          </Button>
          <Input
            label="Fecha de cierre (opcional)"
            type="date"
            value={form.fechaCierre}
            onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
          />
        </form>
      </Modal>

      <Modal
        isOpen={!!results}
        onClose={() => setResults(null)}
        title="Resultados"
        description={parsed?.pregunta || results?.encuesta?.pregunta}
        footer={<Button variant="secondary" onClick={() => setResults(null)}>Cerrar</Button>}
      >
        {parsed ? (
          <div className="stack">
            {parsed.rows.map((r) => {
              const pct = parsed.total ? Math.round((r.votos / parsed.total) * 100) : 0;
              return (
                <div key={r.label} className="poll-result">
                  <div className="row row--between">
                    <span className="text-strong">{r.label}</span>
                    <span className="text-muted text-sm">{formatNumber(r.votos)} · {pct}%</span>
                  </div>
                  <div className="poll-result__bar"><span style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            <p className="text-muted text-sm">Total: {formatNumber(parsed.total)} respuestas</p>
          </div>
        ) : (
          <pre className="poll-raw">{JSON.stringify(results?.data, null, 2)}</pre>
        )}
      </Modal>

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
