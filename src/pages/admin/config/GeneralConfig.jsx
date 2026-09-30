import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { updateConfig, getConfig } from '../../../api/admin';
import { errorMessage } from '../../../utils/format';
import { Card, Input, Button, Alert, Badge } from '../../../components/ui';

/** Estado de la cuenta Nequi para la insignia del resumen. */
function statusOf(current) {
  if (!current) return null;
  if (current.nequiNumero && current.nequiNombre) return { variant: 'success', label: 'Configurado' };
  if (current.nequiNumero || current.nequiNombre) return { variant: 'warning', label: 'Incompleto' };
  return { variant: 'neutral', label: 'Sin configurar' };
}

const EMPTY_FORM = {
  nequiNumero: '', nequiNombre: '', soporteTelefono: '', soporteEmail: '',
};

/**
 * Doc §18: GET/PUT /api/admin/config {nequiNumero?, nequiNombre?, soporteTelefono?, soporteEmail?}.
 * soporteTelefono/soporteEmail son el contacto que ve el cliente en la app (Soporte); si quedan
 * vacíos, el servidor usa un valor fijo de respaldo (support_controller.ts).
 */
export default function GeneralConfig({ notify }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [current, setCurrent] = useState(null);
  const [currentLoading, setCurrentLoading] = useState(true);
  const [currentError, setCurrentError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCurrent = useCallback(async ({ prefill = false } = {}) => {
    setCurrentLoading(true);
    setCurrentError('');
    try {
      const res = await getConfig();
      const data = res.data?.data || res.data || {};
      const next = {
        nequiNumero: data.nequiNumero || '',
        nequiNombre: data.nequiNombre || '',
        soporteTelefono: data.soporteTelefono || '',
        soporteEmail: data.soporteEmail || '',
      };
      setCurrent(next);
      // El formulario arranca con los valores publicados para editar solo lo necesario.
      if (prefill) setForm(next);
    } catch (err) {
      // Informativo: si falla, el formulario sigue funcionando sin mostrar el valor actual.
      setCurrentError(errorMessage(err, 'No se pudo cargar la configuración actual'));
    } finally {
      setCurrentLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrent({ prefill: true }); }, [fetchCurrent]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const numero = form.nequiNumero.trim();
  const nombre = form.nequiNombre.trim();
  const telefono = form.soporteTelefono.trim();
  const email = form.soporteEmail.trim();
  const dirty = !current
    || numero !== current.nequiNumero
    || nombre !== current.nequiNombre
    || telefono !== current.soporteTelefono
    || email !== current.soporteEmail;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    if (numero) payload.nequiNumero = numero;
    if (nombre) payload.nequiNombre = nombre;
    if (telefono) payload.soporteTelefono = telefono;
    if (email) payload.soporteEmail = email;
    if (!Object.keys(payload).length) {
      notify('Ingresa al menos un campo', 'danger');
      return;
    }
    setSaving(true);
    try {
      await updateConfig(payload);
      notify('Configuración actualizada correctamente');
      fetchCurrent({ prefill: true });
    } catch (err) {
      notify(errorMessage(err, 'Error al guardar la configuración'), 'danger');
    } finally {
      setSaving(false);
    }
  };

  const status = statusOf(current);

  return (
    <div className="config__section">
      <div className="config__intro">
        <h2 className="config__intro-title">Pagos y soporte</h2>
        <p className="config__intro-text">
          Cuenta Nequi que la app muestra cuando hay que pagar una deuda o comisión, y el teléfono/correo de soporte que ve el cliente.
        </p>
      </div>

      <Card
        title="Configuración actual"
        description="Datos que ven hoy los usuarios de la app."
        actions={status && (
          <Badge variant={status.variant}>
            <span className="badge__dot" aria-hidden="true" />
            {status.label}
          </Badge>
        )}
      >
        {currentLoading && !current && <div className="config__placeholder">Cargando configuración...</div>}
        {!currentLoading && currentError && !current && (
          <div className="page-error" role="alert">
            <span>{currentError}</span>
            <Button size="sm" variant="ghost" onClick={() => fetchCurrent({ prefill: true })}>Reintentar</Button>
          </div>
        )}
        {current && (
          <div className="config__values">
            <div className="config__value-box">
              <span className="config__value-label">Número Nequi</span>
              {current.nequiNumero
                ? <span className="config__value config__value--mono">{current.nequiNumero}</span>
                : <span className="config__value config__value--empty">Sin configurar</span>}
            </div>
            <div className="config__value-box">
              <span className="config__value-label">Titular de la cuenta</span>
              {current.nequiNombre
                ? <span className="config__value">{current.nequiNombre}</span>
                : <span className="config__value config__value--empty">Sin titular</span>}
            </div>
            <div className="config__value-box">
              <span className="config__value-label">Teléfono de soporte</span>
              {current.soporteTelefono
                ? <span className="config__value config__value--mono">{current.soporteTelefono}</span>
                : <span className="config__value config__value--empty">Usa el valor por defecto</span>}
            </div>
            <div className="config__value-box">
              <span className="config__value-label">Correo de soporte</span>
              {current.soporteEmail
                ? <span className="config__value">{current.soporteEmail}</span>
                : <span className="config__value config__value--empty">Usa el valor por defecto</span>}
            </div>
          </div>
        )}
      </Card>

      <form onSubmit={handleSubmit}>
        <Card
          title="Editar cuenta Nequi y contacto de soporte"
          description="Cambia lo que necesites. Los cambios se aplican de inmediato en la app."
        >
          <Alert variant="info" title="Antes de guardar">
            Verifica que el número y el titular coincidan exactamente con la cuenta Nequi que recibe los pagos.
          </Alert>
          <div className="form-grid">
            <Input
              label="Número Nequi"
              name="nequiNumero"
              inputMode="numeric"
              autoComplete="off"
              value={form.nequiNumero}
              onChange={handleChange}
              placeholder="Ej: 3001234567"
              helperText="Número celular de 10 dígitos asociado a Nequi"
            />
            <Input
              label="Titular de la cuenta"
              name="nequiNombre"
              autoComplete="off"
              value={form.nequiNombre}
              onChange={handleChange}
              placeholder="Ej: CargaExpress SAS"
              helperText="Nombre tal como aparece en Nequi"
            />
            <Input
              label="Teléfono de soporte"
              name="soporteTelefono"
              autoComplete="off"
              value={form.soporteTelefono}
              onChange={handleChange}
              placeholder="Ej: +57 3001234567"
              helperText="Lo ve el cliente en Soporte. Vacío = valor por defecto"
            />
            <Input
              label="Correo de soporte"
              name="soporteEmail"
              type="email"
              autoComplete="off"
              value={form.soporteEmail}
              onChange={handleChange}
              placeholder="Ej: soporte@cargaexpress.com"
              helperText="Lo ve el cliente en Soporte. Vacío = valor por defecto"
            />
          </div>
          <div className="config__footer">
            {current && !dirty && <span className="config__footer-note">Sin cambios pendientes</span>}
            {current && dirty && (
              <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={() => setForm(current)} disabled={saving}>
                Descartar
              </Button>
            )}
            <Button type="submit" icon={<Save size={15} />} loading={saving} disabled={!dirty}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
