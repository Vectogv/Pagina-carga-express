import { useEffect, useState } from 'react';
import { previewCorreo } from '../../api/correo';
import MarcoCelular from '../MarcoCelular';
import { errorMessage } from '../../utils/format';

/** Muestra el correo tal como llega (logo, colores y pie), pedido al servidor con una pausa al escribir. */
export default function VistaPreviaCorreo({ area = 'admin', asunto, cuerpo, userId }) {
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
    <MarcoCelular label="Vista previa del correo en el celular" caption="Así llega a la bandeja del conductor">
      <div className="mail__head">
        <div className="mail__from"><span className="mail__avatar">C</span>CargaExpress · ahora</div>
        <p className="mail__subject">{res.asunto}</p>
      </div>
      <iframe title="Vista previa del correo" srcDoc={res.html} sandbox="" className="mail__body" />
    </MarcoCelular>
  );
}
