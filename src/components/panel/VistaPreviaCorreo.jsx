import { useEffect, useState } from 'react';
import { previewCorreo } from '../../api/correo';
import { errorMessage } from '../../utils/format';

/** Muestra el correo tal como llega (logo, colores y pie), pedido al servidor con una pausa al escribir. */
export default function VistaPreviaCorreo({ area = 'admin', asunto, cuerpo, userId, alto = 460 }) {
  const [res, setRes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!asunto?.trim() || !cuerpo?.trim()) return undefined;
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const { data } = await previewCorreo(area, { asunto, cuerpo, ...(userId ? { userId } : {}) });
        if (vivo) { setRes(data); setError(null); }
      } catch (err) {
        if (vivo) setError(errorMessage(err, 'No se pudo generar la vista previa'));
      }
    }, 400);
    return () => { vivo = false; clearTimeout(t); };
  }, [area, asunto, cuerpo, userId]);

  if (!asunto?.trim() || !cuerpo?.trim()) return <p className="text-sm text-muted">Escribe el asunto y el mensaje para ver la vista previa.</p>;
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!res) return <p className="text-sm text-muted">Generando vista previa…</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="text-sm"><strong>Asunto:</strong> {res.asunto}</span>
      <iframe
        title="Vista previa del correo"
        srcDoc={res.html}
        sandbox=""
        style={{ width: '100%', height: alto, border: '1px solid var(--border)', borderRadius: 8, background: '#f1f5f9' }}
      />
    </div>
  );
}
