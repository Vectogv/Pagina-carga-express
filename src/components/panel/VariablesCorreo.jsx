import { Button } from '../ui';

/**
 * Botones para insertar {{variable}} en el cursor del campo de correo que tuvo el foco
 * (asunto o mensaje). `ids` = { asunto, cuerpo } (ids de los inputs); `onInsert(campo, fn)` con fn(textoActual) → texto nuevo.
 */
export default function VariablesCorreo({ variables, ids, ultimo, onInsert }) {
  if (!variables?.length) return null;
  const insertar = (v) => {
    const campo = ultimo.current || 'cuerpo';
    const el = document.getElementById(ids[campo]);
    const t = `{{${v}}}`;
    const ini = el?.selectionStart ?? null;
    const fin = el?.selectionEnd ?? ini;
    onInsert(campo, (x) => (ini == null ? x + t : x.slice(0, ini) + t + x.slice(fin ?? ini)));
    if (el) {
      const pos = (ini ?? el.value.length) + t.length;
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(pos, pos); });
    }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span className="text-sm text-muted">Variables (clic para insertar en el cursor):</span>
      {variables.map((v) => (
        <Button key={v} size="sm" variant="soft-primary" onClick={() => insertar(v)}>{`{{${v}}}`}</Button>
      ))}
    </div>
  );
}
