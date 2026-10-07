import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { updateConfig, getConfig } from '../../../api/admin';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Alert } from '../../../components/ui';

const DEFAULTS = {
  activo: false, viajesMeta: 5, clientesDistintos: true, diasMeta: 30,
  invitado: { pct: 0, viajes: 0 }, referidor: { pct: 0, viajes: 0, diasUso: 30 },
  maxPremiosConductorMes: 1, topeMensualPesos: 0,
};

/** Mezcla lo que llega del servidor con los valores por defecto. */
function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    ...DEFAULTS, ...r,
    invitado: { ...DEFAULTS.invitado, ...(r.invitado || {}) },
    referidor: { ...DEFAULTS.referidor, ...(r.referidor || {}) },
  };
}

// [clave, ruta, etiqueta, mínimo, máximo]
const CAMPOS = [
  ['viajesMeta', ['viajesMeta'], 'Viajes que debe hacer el invitado', 1, 1000],
  ['diasMeta', ['diasMeta'], 'Días para hacerlos', 1, 365],
  ['invitado.pct', ['invitado', 'pct'], '% de comisión del invitado', 0, 10],
  ['invitado.viajes', ['invitado', 'viajes'], 'Viajes con descuento del invitado', 0, 1000],
  ['referidor.pct', ['referidor', 'pct'], '% de comisión del que invita', 0, 10],
  ['referidor.viajes', ['referidor', 'viajes'], 'Viajes gratis del que invita', 0, 1000],
  ['referidor.diasUso', ['referidor', 'diasUso'], 'Días para usarlos', 1, 365],
  ['maxPremiosConductorMes', ['maxPremiosConductorMes'], 'Premios máximos por conductor al mes', 0, 1000],
  ['topeMensualPesos', ['topeMensualPesos'], 'Tope mensual del programa ($)', 0, 1e9],
];
const get = (f, path) => path.reduce((o, k) => o[k], f);

/** Devuelve el primer error de validación o ''. */
function validate(f) {
  for (const [, path, label, min, max] of CAMPOS) {
    const raw = get(f, path);
    const v = Number(raw);
    if (raw === '' || !Number.isInteger(v) || v < min || v > max) {
      return `${label}: debe ser un entero entre ${min} y ${max}.`;
    }
  }
  return '';
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Programa de referidos de conductores. GET/PUT /api/admin/config {referidos:{...}}. */
export default function ReferidosConfig({ notify }) {
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
      const next = normalize(data.referidos);
      setCurrent(next);
      setForm(next);
    } catch (err) {
      setLoadError(errorMessage(err, 'No se pudo cargar la configuración actual'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrent(); }, [fetchCurrent]);

  const setValue = (path, value) => setForm((p) => {
    const next = { ...p, invitado: { ...p.invitado }, referidor: { ...p.referidor } };
    get(next, path.slice(0, -1))[path[path.length - 1]] = value;
    return next;
  });

  const error = validate(form);
  const dirty = !current || !same(form, current);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) { notify(error, 'danger'); return; }
    const referidos = { activo: form.activo, clientesDistintos: form.clientesDistintos, invitado: {}, referidor: {} };
    CAMPOS.forEach(([, path]) => {
      get(referidos, path.slice(0, -1))[path[path.length - 1]] = Number(get(form, path));
    });
    setSaving(true);
    try {
      await updateConfig({ referidos });
      notify('Referidos actualizado correctamente');
      fetchCurrent();
    } catch (err) {
      notify(errorMessage(err, 'Error al guardar la configuración'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  const check = (label, name) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40 }}>
      <input type="checkbox" checked={!!form[name]} onChange={(e) => setValue([name], e.target.checked)} />
      <span>{label}</span>
    </label>
  );
  const grupo = (...keys) => CAMPOS.filter(([k]) => keys.includes(k)).map(([k, path, label, min, max]) => (
    <Input
      key={k}
      label={label}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step="1"
      value={get(form, path)}
      onChange={(e) => setValue(path, e.target.value)}
    />
  ));

  return (
    <div className="config__section">
      <div className="config__intro">
        <h2 className="config__intro-title">Referidos de conductores</h2>
        <p className="config__intro-text">
          Un conductor invita a otro con su código. Cuando el invitado cumple la meta de viajes, ambos reciben descuento en la comisión.
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
          <Card title="Programa" description="Si lo apagas, no se crean referidos nuevos.">
            <div className="form-grid">{check('Programa activo', 'activo')}</div>
          </Card>

          <Card title="Meta del invitado" description="Lo que debe lograr para que se entreguen los premios.">
            <div className="form-grid">
              {grupo('viajesMeta', 'diasMeta')}
              {check('Exigir clientes distintos', 'clientesDistintos')}
            </div>
          </Card>

          <Card title="Premio del invitado" description="Descuento en su comisión (máximo 10 %).">
            <div className="form-grid">{grupo('invitado.pct', 'invitado.viajes')}</div>
          </Card>

          <Card title="Premio del que invita" description="Descuento en su comisión (máximo 10 %).">
            <div className="form-grid">{grupo('referidor.pct', 'referidor.viajes', 'referidor.diasUso')}</div>
          </Card>

          <Card title="Límites" description="Para controlar cuánto cuesta el programa.">
            <div className="form-grid">{grupo('maxPremiosConductorMes', 'topeMensualPesos')}</div>
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
