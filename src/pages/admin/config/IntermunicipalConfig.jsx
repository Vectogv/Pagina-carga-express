import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { updateConfig, getConfig } from '../../../api/admin';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Alert } from '../../../components/ui';

// Mismos rangos que validarIntermunicipal (intermunicipal_service.ts).
const CAMPOS = [
  { name: 'regresoVacioPct', label: 'Recargo por regreso en vacío', unidad: '%', min: 0, max: 100, entero: true,
    ayuda: 'Porcentaje de los km que se suma al precio sugerido cuando el destino no tiene cobertura.' },
  { name: 'minutosQuieto', label: 'Tiempo quieto para preguntar', unidad: 'min', min: 5, max: 240, entero: true,
    ayuda: 'Si el conductor lleva este tiempo sin avanzar, la app le pregunta qué pasa.' },
  { name: 'metrosQuieto', label: 'Distancia que cuenta como quieto', unidad: 'm', min: 50, max: 5000, entero: true,
    ayuda: 'Si se movió menos que esto en ese tiempo, se considera quieto.' },
  { name: 'recheckTraficoMin', label: 'Revisar el tráfico cada', unidad: 'min', min: 1, max: 120, entero: true,
    ayuda: 'Si hay trancón no se alerta; se vuelve a revisar pasado este tiempo.' },
  { name: 'respuestaMin', label: 'Tiempo para que el conductor responda', unidad: 'min', min: 1, max: 60, entero: true,
    ayuda: 'Sin respuesta, se avisa al moderador de la zona de origen y a la empresa.' },
  { name: 'desvioKm', label: 'Desvío de la ruta que alerta', unidad: 'km', min: 0.5, max: 50, entero: false,
    ayuda: 'Si el conductor se aleja más que esto de la ruta, se sigue el mismo aviso.' },
  { name: 'umbralTrafico', label: 'Umbral de tráfico', unidad: 'veces el tiempo normal', min: 1, max: 5, entero: false,
    ayuda: 'Con 1,3 se considera trancón cuando tarda 30 % más de lo normal.' },
];
const DEFAULTS = {
  activo: false, regresoVacioPct: 30, minutosQuieto: 30, metrosQuieto: 300,
  recheckTraficoMin: 10, respuestaMin: 5, desvioKm: 3, umbralTrafico: 1.3,
};

const normalize = (raw) => {
  const r = raw && typeof raw === 'object' ? raw : {};
  return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, r[k] ?? DEFAULTS[k]]));
};

const errorDe = (c, v) => {
  const n = Number(v);
  const ok = v !== '' && Number.isFinite(n) && n >= c.min && n <= c.max && (!c.entero || Number.isInteger(n));
  return ok ? '' : `${c.label}: entre ${c.min} y ${c.max}${c.entero ? ', número entero' : ''}.`;
};

/** Viaje intermunicipal. GET/PUT /api/admin/config {intermunicipal:{...}} (solo se envía lo que cambió). */
export default function IntermunicipalConfig({ notify }) {
  const [form, setForm] = useState(DEFAULTS);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCurrent = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getConfig();
      const next = normalize((res.data?.data || res.data || {}).intermunicipal);
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

  const cambios = current ? Object.keys(DEFAULTS).filter((k) => String(form[k]) !== String(current[k])) : [];
  const error = cambios
    .map((k) => CAMPOS.find((c) => c.name === k))
    .filter(Boolean)
    .map((c) => errorDe(c, form[c.name]))
    .find(Boolean) || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) { notify(error, 'danger'); return; }
    const intermunicipal = Object.fromEntries(cambios.map((k) => [k, k === 'activo' ? form.activo : Number(form[k])]));
    setSaving(true);
    try {
      await updateConfig({ intermunicipal });
      notify('Viaje intermunicipal actualizado correctamente');
      fetchCurrent();
    } catch (err) {
      notify(errorMessage(err, 'Error al guardar la configuración'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config__section">
      <div className="config__intro">
        <h2 className="config__intro-title">Viaje intermunicipal</h2>
        <p className="config__intro-text">
          Permite pedir viajes a otros municipios y vigila que el viaje avance: si el conductor se detiene o se desvía,
          le pregunta y, si no responde, avisa al moderador.
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
          <Card title="Activar" description="Apagado: un destino fuera de cobertura se rechaza, como siempre.">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40 }}>
              <input
                type="checkbox"
                checked={!!form.activo}
                onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
              />
              <span>Viaje intermunicipal activo</span>
            </label>
          </Card>

          <Card title="Precio y vigilancia" description="Todos los tiempos y distancias se pueden ajustar.">
            <div className="form-grid">
              {CAMPOS.map((c) => (
                <Input
                  key={c.name}
                  label={`${c.label} (${c.unidad})`}
                  name={c.name}
                  type="number"
                  inputMode="decimal"
                  min={c.min}
                  max={c.max}
                  step={c.entero ? 1 : 'any'}
                  value={form[c.name]}
                  onChange={handleChange}
                  helperText={`${c.ayuda} Entre ${c.min} y ${c.max}.`}
                />
              ))}
            </div>
          </Card>

          {error && <Alert variant="warning" title="Revisa los valores">{error}</Alert>}

          <div className="config__footer">
            {!cambios.length && <span className="config__footer-note">Sin cambios pendientes</span>}
            {cambios.length > 0 && (
              <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={() => setForm(current)} disabled={saving}>
                Descartar
              </Button>
            )}
            <Button type="submit" icon={<Save size={15} />} loading={saving} disabled={!cambios.length || !!error}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
