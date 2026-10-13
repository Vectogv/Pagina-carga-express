import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Select, Textarea } from '../ui';
import { formatDateTime } from '../../utils/format';
import { OBS_MAX, OBS_MIN } from './cierreSosValidacion';

/**
 * Cierre de un SOS (admin y moderador): el servidor exige `tipoCierre` (lista de
 * GET /api/config/tipos-cierre-sos) y `observacion` de 20 a 1000 caracteres; si
 * falta algo responde 422. Aquí viven el formulario, la validación y el resumen
 * del caso cerrado, para que las tres pantallas que resuelven usen lo mismo.
 */
let tiposCache = null;
let tiposInflight = null;
function cargarTipos() {
  if (tiposCache) return Promise.resolve(tiposCache);
  tiposInflight = tiposInflight || api.get('/api/config/tipos-cierre-sos')
    .then(({ data }) => { tiposCache = Array.isArray(data) ? data : (data?.data || []); return tiposCache; })
    .catch(() => [])
    .finally(() => { tiposInflight = null; });
  return tiposInflight;
}

export function FormularioCierreSos({ valor, onChange, disabled }) {
  const [tipos, setTipos] = useState(tiposCache || []);
  useEffect(() => {
    let vivo = true;
    cargarTipos().then((t) => { if (vivo) setTipos(t); });
    return () => { vivo = false; };
  }, []);
  const n = valor.observacion.trim().length;
  return (
    <div className="stack">
      <Select
        label="Tipo de caso"
        required
        disabled={disabled}
        value={valor.tipoCierre}
        onChange={(e) => onChange({ ...valor, tipoCierre: e.target.value })}
      >
        <option value="">Elige el tipo…</option>
        {tipos.map((t) => <option key={t.clave} value={t.clave}>{t.etiqueta}</option>)}
      </Select>
      <Textarea
        label="Gestión realizada"
        required
        rows={3}
        disabled={disabled}
        value={valor.observacion}
        onChange={(e) => onChange({ ...valor, observacion: e.target.value })}
        placeholder="Qué pasó y qué se hizo para atender el caso…"
        error={n > OBS_MAX ? `Máximo ${OBS_MAX} caracteres` : undefined}
        helperText={`${n}/${OBS_MAX} caracteres (mínimo ${OBS_MIN})`}
      />
    </div>
  );
}

const nombreDe = (v) => (typeof v === 'string' ? v : `${v?.nombre || ''} ${v?.apellido || ''}`.trim());

/** Resumen del caso ya cerrado. Los cerrados antes de exigir tipo y nota dicen "Sin registrar". */
export function ResumenCierreSos({ alerta }) {
  return (
    <div className="stack">
      <p className="text-sm"><span className="text-strong">Tipo de caso: </span>{alerta.tipoCierreLabel || 'Sin registrar'}</p>
      <p className="text-sm"><span className="text-strong">Gestión realizada: </span>{alerta.observacion || 'Sin registrar'}</p>
      <p className="text-sm text-muted">
        Resuelto por {nombreDe(alerta.resueltoPor) || 'Sin registrar'}{alerta.resueltaAt ? ` · ${formatDateTime(alerta.resueltaAt)}` : ''}
      </p>
    </div>
  );
}
