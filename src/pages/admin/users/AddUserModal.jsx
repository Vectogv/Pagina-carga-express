import { useState } from 'react';
import { Alert, Button, Input, Modal, Select } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import { registerUser, setModerator, setUserRole } from '../../../api/admin';
import { useZonas } from '../../../hooks/useZonas';
import './users.css';

const EMPTY = {
  nombre: '', apellido: '', email: '', password: '', telefono: '', edad: '',
  rol: 'cliente', cedula: '', placa: '', tipoVehiculo: '', capacidad: '', ciudad: '',
  esModerador: false, zonaModerador: '',
};

/**
 * Crear usuario. El backend solo tiene el endpoint de registro
 * (POST /api/auth/register), que exige nombre, apellido, email, password y edad,
 * acepta rol solo 'cliente' o 'conductor', y para conductores además exige cedula,
 * placa, tipoVehiculo y capacidad.
 *
 * Administrador y moderador no son roles del registro: se aplican después sobre la
 * cuenta ya creada con PUT /users/:id/role y PUT /users/:id/moderator.
 * onCreated(message, warning) al terminar.
 */
export default function AddUserModal({ onClose, onCreated }) {
  const ZONAS = useZonas();
  const [form, setForm] = useState(EMPTY);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const esConductor = form.rol === 'conductor';

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrores((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  /** Mismas reglas que el backend, para avisar antes de enviar. */
  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Obligatorio';
    else if (form.nombre.trim().length > 100) e.nombre = 'Máximo 100 caracteres';
    if (!form.apellido.trim()) e.apellido = 'Obligatorio';
    else if (form.apellido.trim().length > 100) e.apellido = 'Máximo 100 caracteres';
    if (!form.email.trim()) e.email = 'Obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo no válido';
    if (!form.password) e.password = 'Obligatoria';
    else if (form.password.length < 6 || form.password.length > 32) e.password = 'Entre 6 y 32 caracteres';
    const edad = Number(form.edad);
    if (form.edad === '') e.edad = 'Obligatoria';
    else if (!Number.isInteger(edad) || edad < 18 || edad > 120) e.edad = 'Entre 18 y 120 años';
    if (form.telefono.trim().length > 20) e.telefono = 'Máximo 20 caracteres';
    if (esConductor) {
      if (!form.cedula.trim()) e.cedula = 'Obligatoria para conductores';
      if (!form.placa.trim()) e.placa = 'Obligatoria para conductores';
      if (!form.tipoVehiculo.trim()) e.tipoVehiculo = 'Obligatorio para conductores';
      if (!form.capacidad.trim()) e.capacidad = 'Obligatoria para conductores';
    }
    if (form.esModerador && !form.zonaModerador) e.zonaModerador = 'Elige la zona del moderador';
    return e;
  };

  const handleCreate = async () => {
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) {
      setError('Revisa los campos marcados.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // El registro no admite rol 'admin': la cuenta se crea como cliente y
      // después se promueve con el endpoint de rol.
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        password: form.password,
        edad: Number(form.edad),
        rol: esConductor ? 'conductor' : 'cliente',
      };
      if (form.telefono.trim()) payload.telefono = form.telefono.trim();
      if (esConductor) {
        payload.cedula = form.cedula.trim();
        payload.placa = form.placa.trim();
        payload.tipoVehiculo = form.tipoVehiculo.trim();
        payload.capacidad = form.capacidad.trim();
        if (form.ciudad) payload.ciudad = form.ciudad;
      }

      const res = await registerUser(payload);
      const newId = res.data?.id || res.data?.user?.id;

      // Ajustes posteriores: sin id no se pueden aplicar, y se avisa sin perder la cuenta.
      const avisos = [];
      if (form.rol === 'admin') {
        if (!newId) avisos.push('no se pudo promover a administrador (el servidor no devolvió el id)');
        else {
          try {
            await setUserRole(newId, { rol: 'admin' });
          } catch (err) {
            avisos.push(`quedó como cliente, falló la promoción a administrador: ${errorMessage(err, 'error desconocido')}`);
          }
        }
      }
      if (form.esModerador) {
        if (!newId) avisos.push('no se pudo asignar como moderador (el servidor no devolvió el id)');
        else {
          try {
            await setModerator(newId, { esModerador: true, zonaModerador: form.zonaModerador });
          } catch (err) {
            avisos.push(`falló la asignación de moderador: ${errorMessage(err, 'error desconocido')}`);
          }
        }
      }

      const que = form.rol === 'admin' ? 'Administrador' : esConductor ? 'Conductor' : 'Usuario';
      onCreated(
        `${que} creado correctamente`,
        avisos.length > 0 ? `Cuenta creada, pero ${avisos.join('; ')}.` : null,
      );
    } catch (err) {
      setError(errorMessage(err, 'Error al crear usuario'));
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Agregar usuario"
      description="Crea una cuenta nueva y, si aplica, asígnala como administrador o moderador."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCreate} loading={saving}>Crear usuario</Button>
        </>
      )}
    >
      <div className="stack">
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="form-grid">
          <Input label="Nombre" required autoFocus value={form.nombre} onChange={set('nombre')} error={errores.nombre} />
          <Input label="Apellido" required value={form.apellido} onChange={set('apellido')} error={errores.apellido} />
          <Input
            label="Correo"
            required
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={set('email')}
            placeholder="email@ejemplo.com"
            error={errores.email}
          />
          <Input
            label="Contraseña"
            required
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            placeholder="Mínimo 6 caracteres"
            helperText="Entre 6 y 32 caracteres"
            error={errores.password}
          />
          <Input
            label="Edad"
            required
            type="number"
            min="18"
            max="120"
            value={form.edad}
            onChange={set('edad')}
            placeholder="18–120"
            helperText="El servidor exige mayoría de edad"
            error={errores.edad}
          />
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={set('telefono')}
            placeholder="3001234567"
            error={errores.telefono}
          />
          <Select label="Rol" required value={form.rol} onChange={set('rol')}>
            <option value="cliente">Cliente</option>
            <option value="conductor">Conductor</option>
            <option value="admin">Administrador</option>
          </Select>
        </div>

        {esConductor && (
          <div className="option-panel">
            <p className="text-sm text-secondary">Datos del vehículo (obligatorios para conductores)</p>
            <div className="form-grid">
              <Input label="Cédula" required value={form.cedula} onChange={set('cedula')} error={errores.cedula} />
              <Input label="Placa" required value={form.placa} onChange={set('placa')} placeholder="ABC123" error={errores.placa} />
              <Input
                label="Tipo de vehículo"
                required
                value={form.tipoVehiculo}
                onChange={set('tipoVehiculo')}
                placeholder="Camioneta, turbo, furgón…"
                error={errores.tipoVehiculo}
              />
              <Input
                label="Capacidad"
                required
                value={form.capacidad}
                onChange={set('capacidad')}
                placeholder="1 tonelada"
                error={errores.capacidad}
              />
              <Select label="Ciudad" value={form.ciudad} onChange={set('ciudad')} helperText="Zona donde operará">
                <option value="">Sin asignar</option>
                {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
              </Select>
            </div>
            <p className="text-sm text-muted">Queda pendiente de verificación hasta que se aprueben sus documentos.</p>
          </div>
        )}

        <div className="option-panel">
          <label className="check">
            <input type="checkbox" checked={form.esModerador} onChange={set('esModerador')} />
            Asignar como moderador
          </label>
          {form.esModerador && (
            <Select
              label="Zona del moderador"
              required
              value={form.zonaModerador}
              onChange={set('zonaModerador')}
              helperText="El moderador solo verá y gestionará conductores de su ciudad."
              error={errores.zonaModerador}
            >
              <option value="">Elige una zona</option>
              {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </Select>
          )}
        </div>
      </div>
    </Modal>
  );
}
