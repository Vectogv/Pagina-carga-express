import { useState, useEffect, useCallback } from 'react';
import { Gavel } from 'lucide-react';
import { Button, Modal, Select, Input, Textarea, StatusBadge } from '../ui';
import { errorMessage, formatDate } from '../../utils/format';

// Tipos que acepta el servidor (sanciones_service.ts). Suspensión larga y bloqueo: solo gerencia.
const TIPOS_SANCION = [
  { value: 'advertencia', label: 'Advertencia' },
  { value: 'cobro_comision', label: 'Cobro de comisión' },
  { value: 'suspension_temporal', label: 'Suspensión temporal' },
  { value: 'suspension_larga', label: 'Suspensión larga', soloAdmin: true },
  { value: 'bloqueo', label: 'Bloqueo', soloAdmin: true },
];
export const MAX_DIAS_MODERADOR = 30;
const etiquetaTipo = (t) => TIPOS_SANCION.find((x) => x.value === t)?.label || t;

/** Modal para aplicar una sanción. onSubmit({tipo, dias?, motivo, viajeId?}) debe lanzar si falla. */
export function SancionModal({ isOpen, onClose, onSubmit, esAdmin = false, viajeId, titulo = 'Sancionar' }) {
  const [tipo, setTipo] = useState('advertencia');
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (isOpen) { setTipo('advertencia'); setDias(''); setMotivo(''); setError(null); } }, [isOpen]);

  const necesitaDias = tipo.startsWith('suspension');
  const tipos = TIPOS_SANCION.filter((t) => esAdmin || !t.soloAdmin);

  const enviar = async () => {
    if (motivo.trim().length < 20) { setError('El motivo debe tener al menos 20 caracteres'); return; }
    if (necesitaDias) {
      const n = Number(dias);
      if (!Number.isInteger(n) || n < 1) { setError('Indica los días de suspensión (entero mayor a 0)'); return; }
      if (!esAdmin && n > MAX_DIAS_MODERADOR) { setError(`Un moderador sanciona máximo ${MAX_DIAS_MODERADOR} días`); return; }
    }
    setBusy(true); setError(null);
    try {
      await onSubmit({
        tipo,
        motivo: motivo.trim(),
        ...(necesitaDias ? { dias: Number(dias) } : {}),
        ...(viajeId ? { viajeId } : {}),
      });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo aplicar la sanción'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo}>
      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <Select label="Tipo de sanción" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={busy}>
          {tipos.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        {necesitaDias && (
          <Input
            label={`Días de suspensión${esAdmin ? '' : ` (máx. ${MAX_DIAS_MODERADOR})`}`}
            type="number" min="1" inputMode="numeric"
            value={dias} onChange={(e) => setDias(e.target.value)} disabled={busy}
          />
        )}
        <Textarea
          label="Motivo (mínimo 20 caracteres)"
          value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={busy}
          placeholder="Qué pasó y por qué se aplica esta sanción."
        />
        {!esAdmin && (
          <p className="text-sm text-muted">Suspensión larga o bloqueo los decide gerencia. El usuario puede apelar esta sanción.</p>
        )}
        {error && <div className="page-error" role="alert">{error}</div>}
        <div className="row row--end" style={{ gap: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="danger" icon={<Gavel size={14} />} loading={busy} onClick={enviar}>Aplicar sanción</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Historial de sanciones de una persona + botón para sancionar. cargar() → res.data lista; aplicar(data) → promesa. */
export function SancionesPanel({ cargar, aplicar, viajeId, esAdmin = false }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await cargar();
      const d = res.data;
      setLista(Array.isArray(d) ? d : (d?.data || d?.sanciones || []));
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las sanciones'));
    } finally {
      setLoading(false);
    }
  }, [cargar]);

  useEffect(() => { recargar(); }, [recargar]);

  return (
    <section className="trip-detail__section">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h4 className="section-title"><Gavel size={14} /> Sanciones</h4>
        <Button size="sm" variant="danger" onClick={() => setAbierto(true)}>Sancionar</Button>
      </div>
      {error && <div className="page-error" role="alert">{error}</div>}
      {loading ? <p className="text-muted">Cargando…</p> : lista.length === 0 ? (
        <p className="text-muted">Sin sanciones registradas.</p>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, gap: 'var(--space-2)' }}>
          {lista.map((s) => (
            <li key={s.id} className="card" style={{ padding: 'var(--space-3)' }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong>{s.tipoLabel || etiquetaTipo(s.tipo)}</strong>
                {s.dias ? <span className="text-muted">{s.dias} días</span> : null}
                <StatusBadge status={s.estado} />
                <span className="text-muted text-sm">{formatDate(s.createdAt)}</span>
              </div>
              <p className="text-sm" style={{ margin: '4px 0 0' }}>{s.motivo}</p>
              {s.apelacion && <p className="text-sm text-muted" style={{ margin: '4px 0 0' }}>Apelación: {s.apelacion}</p>}
            </li>
          ))}
        </ul>
      )}
      <SancionModal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        esAdmin={esAdmin}
        viajeId={viajeId}
        onSubmit={async (data) => { await aplicar(data); setAbierto(false); await recargar(); }}
      />
    </section>
  );
}
