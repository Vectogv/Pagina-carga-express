import { useEffect, useRef } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { formatTime } from '../../../utils/format';
import { Button } from '../../../components/ui';

/** Chat privado del caso de emergencia con el solicitante. */
export default function EmergencyChat({
  title, readOnly, mensajes, loading, error, onRetry, texto, onTextoChange, onSend, sending,
}) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [mensajes]);

  const submit = (e) => {
    e.preventDefault();
    onSend();
  };

  return (
    <section className="em-card">
      <h4 className="section-title">{title}{readOnly ? ' · solo lectura' : ''}</h4>
      <div className="em-chat" ref={listRef} aria-live="polite">
        {loading && <p className="em-chat__hint">Cargando mensajes…</p>}
        {error && (
          <div className="page-error row row--between" role="alert">
            <span>{error}</span>
            <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={onRetry}>Reintentar</Button>
          </div>
        )}
        {!loading && !error && mensajes.length === 0 && (
          <p className="em-chat__hint">Sin mensajes aún. Saluda al conductor o cliente.</p>
        )}
        {mensajes.map((m) => {
          const isMod = !!m.remitente?.esModerador;
          return (
            <div key={m.id} className={`em-msg ${isMod ? 'em-msg--own' : ''}`}>
              <div className="em-msg__meta">
                <span className="em-msg__author">{m.remitente?.nombre || (isMod ? 'Tú' : 'Usuario')}</span>
                {m.remitente?.rol && <span className="em-msg__role">{m.remitente.rol}</span>}
                <span>{formatTime(m.createdAt)}</span>
              </div>
              <div className="em-msg__bubble">{m.mensaje}</div>
            </div>
          );
        })}
      </div>
      {readOnly ? (
        <p className="em-chat__hint">Caso resuelto: el chat queda en solo lectura.</p>
      ) : (
        <form className="em-chat__composer" onSubmit={submit}>
          <input
            className="em-chat__input"
            value={texto}
            onChange={(e) => onTextoChange(e.target.value)}
            placeholder="Escribe un mensaje…"
            disabled={sending}
            aria-label="Mensaje"
          />
          <Button type="submit" icon={<Send size={14} />} loading={sending} disabled={!texto.trim()}>
            Enviar
          </Button>
        </form>
      )}
    </section>
  );
}
