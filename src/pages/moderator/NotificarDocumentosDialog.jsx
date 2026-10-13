import { useState } from 'react';
import { ConfirmDialog, Textarea } from '../../components/ui';
import useDocumentosConductor from '../../hooks/useDocumentosConductor';

// Notificar al conductor qué documentos le faltan (vienen marcados los que
// faltan). Sin nada marcado se envía el recordatorio de actividad de siempre.
// Móntalo solo mientras está abierto: así arranca con los faltantes de ese conductor.
export default function NotificarDocumentosDialog({ onClose, faltantes, destinatario, onEnviar }) {
  const { documentos } = useDocumentosConductor();
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
        {documentos.map(({ clave, etiqueta }) => (
          <label key={clave} className="row">
            <input type="checkbox" checked={marcados.includes(clave)} onChange={() => toggle(clave)} /> {etiqueta}
          </label>
        ))}
        <Textarea label="Nota para el conductor (opcional)" value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={2} maxLength={500} />
      </div>
    </ConfirmDialog>
  );
}
