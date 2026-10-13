import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { updateConfig, getConfig } from '../../../api/admin';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Alert } from '../../../components/ui';

const DEFAULTS = {
  radioInicialKm: 3, minAmpliar: 3, radioAmpliadoKm: 8, minSugerencia: 5, minCierre: 20,
  minRespuestaCierre: 10, minSeguirEsperando: 20,
  etapas: { ampliar: true, sugerencia: true, cierre: true },
  tarifaKm: { piaggio: 0, furgon: 0, camioneta: 0, default: 0 },
  arranque: { piaggio: 0, furgon: 0, camioneta: 0, default: 0 },
  ayuda: { porDefecto: { piso1: 0, piso2: 0, piso3: 0, piso4: 0 }, min: 0, max: 100000 },
};
const NUM_KEYS = Object.keys(DEFAULTS).filter((k) => k !== 'etapas' && k !== 'tarifaKm' && k !== 'arranque' && k !== 'ayuda');
const TARIFAS = [['piaggio', 'Piaggio'], ['furgon', 'Furgón sellado'], ['camioneta', 'Camioneta'], ['default', 'Por defecto (otros vehículos)']];
const MAX_TARIFA = 100000;
const MAX_ARRANQUE = 2000000;
const PISOS = [['piso1', 'Casa o 1.er piso'], ['piso2', '2.º piso'], ['piso3', '3.er piso'], ['piso4', '4.º piso o más']];
const MAX_KM = 20; // tope de ofertas del servidor

/** Mezcla lo que llega del servidor con los valores por defecto. */
function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = { etapas: { ...DEFAULTS.etapas, ...(r.etapas || {}) } };
  out.tarifaKm = {};
  TARIFAS.forEach(([k]) => { out.tarifaKm[k] = r.tarifaKm?.[k] ?? 0; });
  out.arranque = {};
  TARIFAS.forEach(([k]) => { out.arranque[k] = r.arranque?.[k] ?? 0; });
  const a = r.ayuda || {};
  out.ayuda = { min: a.min ?? DEFAULTS.ayuda.min, max: a.max ?? DEFAULTS.ayuda.max, porDefecto: {} };
  PISOS.forEach(([k]) => { out.ayuda.porDefecto[k] = a.porDefecto?.[k] ?? 0; });
  NUM_KEYS.forEach((k) => { out[k] = r[k] ?? DEFAULTS[k]; });
  return out;
}

/** Devuelve el primer error de validación o ''. */
function validate(f) {
  for (const k of NUM_KEYS) {
    const v = Number(f[k]);
    if (f[k] === '' || !Number.isFinite(v) || v <= 0) return 'Todos los valores deben ser números mayores que 0.';
  }
  const n = (k) => Number(f[k]);
  if (n('radioInicialKm') > MAX_KM || n('radioAmpliadoKm') > MAX_KM) return `Los radios no pueden pasar de ${MAX_KM} km.`;
  if (n('radioAmpliadoKm') <= n('radioInicialKm')) return 'El radio ampliado debe ser mayor que el radio inicial.';
  for (const [k, label] of TARIFAS) {
    const t = f.tarifaKm[k];
    const v = Number(t);
    if (t === '' || !Number.isInteger(v) || v < 0 || v > MAX_TARIFA) return `El valor por km de ${label} debe ser un entero entre 0 y ${MAX_TARIFA}.`;
  }
  for (const [k, label] of TARIFAS) {
    const v = Number(f.arranque[k]);
    if (f.arranque[k] === '' || !Number.isInteger(v) || v < 0 || v > MAX_ARRANQUE) return `El arranque de ${label} debe ser un entero entre 0 y ${MAX_ARRANQUE}.`;
  }
  const { min, max, porDefecto } = f.ayuda;
  const ok = (x) => x !== '' && Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= MAX_ARRANQUE;
  if (![min, max, ...PISOS.map(([k]) => porDefecto[k])].every(ok)) return `La ayuda del conductor debe ser en enteros entre 0 y ${MAX_ARRANQUE}.`;
  if (Number(min) > Number(max)) return 'El mínimo de la ayuda no puede ser mayor que el máximo.';
  if (PISOS.some(([k]) => Number(porDefecto[k]) < Number(min) || Number(porDefecto[k]) > Number(max))) return 'La tarifa de ayuda por piso debe estar entre el mínimo y el máximo.';
  if (!(n('minAmpliar') < n('minSugerencia') && n('minSugerencia') < n('minCierre'))) {
    return 'Los tiempos deben ir en orden: ampliar < sugerencia < cierre.';
  }
  return '';
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Escalera de acompañamiento para viajes sin ofertas.
 * GET/PUT /api/admin/config {escalera:{...}}.
 */
export default function EscaleraConfig({ notify }) {
  const [form, setForm] = useState(normalize(null));
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCurrent = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getConfig();
      const data = res.data?.data || res.data || {};
      const next = normalize(data.escalera);
      setCurrent(next);
      setForm(next);
    } catch (err) {
      setLoadError(errorMessage(err, 'No se pudo cargar la configuración actual'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrent(); }, [fetchCurrent]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleTarifa = (e) => setForm((p) => ({ ...p, tarifaKm: { ...p.tarifaKm, [e.target.name]: e.target.value } }));
  const handleArranque = (e) => setForm((p) => ({ ...p, arranque: { ...p.arranque, [e.target.name]: e.target.value } }));
  const handleAyuda = (e) => setForm((p) => ({ ...p, ayuda: { ...p.ayuda, [e.target.name]: e.target.value } }));
  const handlePiso = (e) => setForm((p) => ({ ...p, ayuda: { ...p.ayuda, porDefecto: { ...p.ayuda.porDefecto, [e.target.name]: e.target.value } } }));
  const handleStage = (e) => setForm((p) => ({ ...p, etapas: { ...p.etapas, [e.target.name]: e.target.checked } }));

  const error = validate(form);
  const dirty = !current || !same(form, current);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) { notify(error, 'danger'); return; }
    const escalera = { etapas: form.etapas, tarifaKm: {}, arranque: {}, ayuda: { min: Number(form.ayuda.min), max: Number(form.ayuda.max), porDefecto: {} } };
    TARIFAS.forEach(([k]) => { escalera.tarifaKm[k] = Number(form.tarifaKm[k]); });
    TARIFAS.forEach(([k]) => { escalera.arranque[k] = Number(form.arranque[k]); });
    PISOS.forEach(([k]) => { escalera.ayuda.porDefecto[k] = Number(form.ayuda.porDefecto[k]); });
    NUM_KEYS.forEach((k) => { escalera[k] = Number(form[k]); });
    setSaving(true);
    try {
      await updateConfig({ escalera });
      notify('Búsqueda actualizada correctamente');
      fetchCurrent();
    } catch (err) {
      notify(errorMessage(err, 'Error al guardar la configuración'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  const f = form;
  const num = (name, label, helperText, unit) => (
    <Input
      label={`${label} (${unit})`}
      name={name}
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      value={f[name]}
      onChange={handleChange}
      helperText={helperText}
    />
  );

  const stage = (name, label) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40 }}>
      <input type="checkbox" name={name} checked={!!f.etapas[name]} onChange={handleStage} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="config__section">
      <div className="config__intro">
        <h2 className="config__intro-title">Búsqueda de conductor</h2>
        <p className="config__intro-text">
          Qué hacemos cuando un viaje no recibe ofertas: ampliar la zona, sugerir un precio mayor y, al final, ofrecer cerrar la búsqueda.
        </p>
      </div>

      {loading && !current && <div className="config__placeholder">Cargando configuración...</div>}
      {!loading && loadError && !current && (
        <div className="page-error" role="alert">
          <span>{loadError}</span>
          <Button size="sm" variant="ghost" onClick={fetchCurrent}>Reintentar</Button>
        </div>
      )}

      {current && (
        <form onSubmit={handleSubmit}>
          <Card title="Etapas" description="Apaga la que no quieras usar.">
            <div className="form-grid">
              {stage('ampliar', 'Ampliar la zona de búsqueda')}
              {stage('sugerencia', 'Sugerir subir el precio')}
              {stage('cierre', 'Ofrecer cerrar la búsqueda')}
            </div>
          </Card>

          <Card title="Zona de búsqueda" description="Distancia a la que avisamos a los conductores.">
            <div className="form-grid">
              {num('radioInicialKm', 'Radio inicial', `Al publicar, avisamos a conductores hasta ${f.radioInicialKm} km.`, 'km')}
              {num('minAmpliar', 'Ampliar a los', `A los ${f.minAmpliar} min sin ofertas, avisamos a conductores hasta ${f.radioAmpliadoKm} km.`, 'min')}
              {num('radioAmpliadoKm', 'Radio ampliado', `Debe ser mayor que el inicial y máximo ${MAX_KM} km.`, 'km')}
            </div>
          </Card>

          <Card title="Sugerencia de precio" description="Cuando nadie ofertó, proponemos subir lo que se paga.">
            <div className="form-grid">
              {num('minSugerencia', 'Sugerir a los', `A los ${f.minSugerencia} min sin ofertas, sugerimos un precio.`, 'min')}
              {TARIFAS.map(([k, label]) => (
                <Input
                  key={k}
                  label={`Valor por km: ${label} ($)`}
                  name={k}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={MAX_TARIFA}
                  step="1"
                  value={f.tarifaKm[k]}
                  onChange={handleTarifa}
                  helperText="El valor sugerido = km del viaje × este valor. 0 = no sugerir para este vehículo."
                />
              ))}
            </div>
          </Card>

          <Card title="Arranque del precio" description="Precio sugerido al cliente = arranque + km × valor del km.">
            <div className="form-grid">
              {TARIFAS.map(([k, label]) => (
                <Input
                  key={k}
                  label={`Arranque: ${label} ($)`}
                  name={k}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max={MAX_ARRANQUE}
                  step="1"
                  value={f.arranque[k]}
                  onChange={handleArranque}
                  helperText="Valor fijo que se suma al valor por km."
                />
              ))}
            </div>
          </Card>

          <Card title="Ayuda del conductor" description="Cada conductor pone su propia tarifa en la app; esta es la que usa si no la ha puesto. La ayuda no paga comisión.">
            <div className="form-grid">
              <Input label="Mínimo ($)" name="min" type="number" inputMode="numeric" min="0" max={MAX_ARRANQUE} step="1" value={f.ayuda.min} onChange={handleAyuda} helperText="Lo menos que un conductor puede cobrar por ayuda." />
              <Input label="Máximo ($)" name="max" type="number" inputMode="numeric" min="0" max={MAX_ARRANQUE} step="1" value={f.ayuda.max} onChange={handleAyuda} helperText="Lo más que un conductor puede cobrar por ayuda." />
              {PISOS.map(([k, label]) => (
                <Input key={k} label={`Por defecto: ${label} ($)`} name={k} type="number" inputMode="numeric" min="0" max={MAX_ARRANQUE} step="1" value={f.ayuda.porDefecto[k]} onChange={handlePiso} helperText="Debe estar entre el mínimo y el máximo." />
              ))}
            </div>
          </Card>

          <Card title="Cierre de la búsqueda" description="Si pasa mucho tiempo sin conductor.">
            <div className="form-grid">
              {num('minCierre', 'Ofrecer cerrar a los', `A los ${f.minCierre} min sin ofertas, le preguntamos al cliente si cierra la búsqueda.`, 'min')}
              {num('minRespuestaCierre', 'Tiempo para responder', `El cliente tiene ${f.minRespuestaCierre} min para contestar; si no, cerramos.`, 'min')}
              {num('minSeguirEsperando', 'Si sigue esperando', `Si el cliente decide esperar, volvemos a preguntar a los ${f.minSeguirEsperando} min.`, 'min')}
            </div>
          </Card>

          {error && <Alert variant="warning" title="Revisa los valores">{error}</Alert>}

          <div className="config__footer">
            {!dirty && <span className="config__footer-note">Sin cambios pendientes</span>}
            {dirty && (
              <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={() => setForm(current)} disabled={saving}>
                Descartar
              </Button>
            )}
            <Button type="submit" icon={<Save size={15} />} loading={saving} disabled={!dirty || !!error}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
