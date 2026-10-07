import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { updateConfig, getConfig } from '../../../api/admin';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Alert } from '../../../components/ui';

const DEFAULTS = {
  radioInicialKm: 3, minAmpliar: 3, radioAmpliadoKm: 8, minSugerencia: 5, minCierre: 20,
  minRespuestaCierre: 10, minSeguirEsperando: 20, pctSugerenciaMin: 15, pctSugerenciaMax: 30,
  etapas: { ampliar: true, sugerencia: true, cierre: true },
};
const NUM_KEYS = Object.keys(DEFAULTS).filter((k) => k !== 'etapas');
const MAX_KM = 20; // tope de ofertas del servidor

/** Mezcla lo que llega del servidor con los valores por defecto. */
function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = { etapas: { ...DEFAULTS.etapas, ...(r.etapas || {}) } };
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
  if (n('pctSugerenciaMin') >= n('pctSugerenciaMax')) return 'El porcentaje mínimo debe ser menor que el máximo.';
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
  const handleStage = (e) => setForm((p) => ({ ...p, etapas: { ...p.etapas, [e.target.name]: e.target.checked } }));

  const error = validate(form);
  const dirty = !current || !same(form, current);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) { notify(error, 'danger'); return; }
    const escalera = { etapas: form.etapas };
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
              {num('minSugerencia', 'Sugerir a los', `A los ${f.minSugerencia} min sin ofertas, sugerimos subir el precio.`, 'min')}
              {num('pctSugerenciaMin', 'Subida mínima', 'Porcentaje más bajo que sugerimos.', '%')}
              {num('pctSugerenciaMax', 'Subida máxima', 'Porcentaje más alto que sugerimos. Mayor que el mínimo.', '%')}
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
