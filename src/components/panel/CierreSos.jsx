import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Select, Textarea } from '../ui';
import { formatDateTime } from '../../utils/format';
import { OBS_MAX, OBS_MIN, TIPOS_SOS } from './cierreSosValidacion';

/**
 * Cierre de un SOS (admin y moderador) y resolución de una disputa (admin): el servidor
 * exige el tipo (`tipoCierre` / `tipoResolucion`, lista de TIPOS_SOS / TIPOS_DISPUTA) y
 * `observacion` de 20 a 1000 caracteres; si falta algo responde 422. Aquí viven el formulario, la validación y el resumen
 * del caso cerrado, para que las tres pantallas que resuelven usen lo mismo.
 */
// Caché por URL: la misma lista sirve a todas las pantallas que cierran SOS o resuelven disputas.
const tiposCache = {};
const tiposInflight = {};
function cargarTipos(url) {
  if (tiposCache[url]) return Promise.resolve(tiposCache[url]);
  tiposInflight[url] = tiposInflight[url] || api.get(url)
    .then(({ data }) => { tiposCache[url] = Array.isArray(data) ? data : (data?.data || []); return tiposCache[url]; })
    .catch(() => [])
    .finally(() => { delete tiposInflight[url]; });
  return tiposInflight[url];
}

/** `tiposUrl`: lista de tipos (TIPOS_SOS por defecto, TIPOS_DISPUTA para resolver disputas). */
export function FormularioCierreSos({ valor, onChange, disabled, tiposUrl = TIPOS_SOS, labelTipo = 'Tipo de caso' }) {
  const [tipos, setTipos] = useState(tiposCache[tiposUrl] || []);
  useEffect(() => {
    let vivo = true;
    cargarTipos(tiposUrl).then((t) => { if (vivo) setTipos(t); });
    return () => { vivo = false; };
  }, [tiposUrl]);
  const n = valor.observacion.trim().length;
  return (
    <div className="stack">
      <Select
        label={labelTipo}
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

// Las disputas traen `resueltoPor` como id de usuario; el SOS, como nombre u objeto.
const nombreDe = (v) => (typeof v === 'number' ? `usuario #${v}` : typeof v === 'string' ? v : `${v?.nombre || ''} ${v?.apellido || ''}`.trim());

/** Resumen del caso ya cerrado. Los cerrados antes de exigir tipo y nota dicen "Sin registrar". */
export function ResumenCierreSos({ alerta, labelTipo = 'Tipo de caso' }) {
  return (
    <div className="stack">
      <p className="text-sm"><span className="text-strong">{labelTipo}: </span>{alerta.tipoCierreLabel || alerta.tipoResolucionLabel || 'Sin registrar'}</p>
      <p className="text-sm"><span className="text-strong">Gestión realizada: </span>{alerta.observacion || 'Sin registrar'}</p>
      <p className="text-sm text-muted">
        Resuelto por {nombreDe(alerta.resueltoPor) || 'Sin registrar'}{alerta.resueltaAt ? ` · ${formatDateTime(alerta.resueltaAt)}` : ''}
      </p>
    </div>
  );
}
