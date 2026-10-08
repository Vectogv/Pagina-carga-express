import { useState } from 'react';
import { ConfirmDialog, Textarea } from '../../components/ui';
import { DOCUMENTOS_CONDUCTOR } from '../../utils/documentos';

// Notificar al conductor qué documentos le faltan (vienen marcados los que
// faltan). Sin nada marcado se envía el recordatorio de actividad de siempre.
// Móntalo solo mientras está abierto: así arranca con los faltantes de ese conductor.
export default function NotificarDocumentosDialog({ onClose, faltantes, destinatario, onEnviar }) {
  const [marcados, setMarcados] = useState(faltantes);
  const [mensaje, setMensaje] = useState('');
  const toggle = (k) => setMarcados((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={() => onEnviar(marcados.length ? { documentos: marcados, mensaje: mensaje.trim() || undefined } : undefined)}
      title="Notificar conductor"
      message={`Se le enviará una notificación a ${destinatario} con los documentos marcados. Sin ninguno marcado recibe el recordatorio de actividad.`}
      confirmText="Enviar"
    >
      <div className="stack">
        {DOCUMENTOS_CONDUCTOR.map(([k, label]) => (
          <label key={k} className="row">
            <input type="checkbox" checked={marcados.includes(k)} onChange={() => toggle(k)} /> {label}
          </label>
        ))}
        <Textarea label="Nota para el conductor (opcional)" value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={2} maxLength={500} />
      </div>
    </ConfirmDialog>
  );
}
