import { useState } from 'react';
import { Alert, Button, Input, Modal, Select } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import { registerUser, setModerator } from '../../../api/admin';
import { useZonas } from '../../../hooks/useZonas';
import './users.css';

const EMPTY = { nombre: '', apellido: '', email: '', password: '', telefono: '', rol: 'cliente', esModerador: false, zonaModerador: '' };

/**
 * Crear usuario (Doc §1: POST /api/auth/register {nombre,apellido,email,password,telefono,rol})
 * y opcionalmente asignarlo como moderador. onCreated(message, warning) al terminar.
 */
export default function AddUserModal({ onClose, onCreated }) {
  const ZONAS = useZonas();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Nombre, apellido, correo y contraseña son obligatorios');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        password: form.password,
        rol: form.rol,
      };
      if (form.telefono.trim()) payload.telefono = form.telefono.trim();
      const res = await registerUser(payload);
      const newId = res.data?.id || res.data?.user?.id;
      let warning = null;
      // Si se marcó moderador, se asigna después de crear la cuenta.
      if (form.esModerador && newId) {
        try {
          await setModerator(newId, { esModerador: true, zonaModerador: form.zonaModerador });
        } catch (e) {
          warning = `Usuario creado, pero falló la asignación de moderador: ${errorMessage(e, '')}`;
        }
      }
      onCreated(`${form.esModerador ? 'Moderador' : 'Usuario'} creado correctamente`, warning);
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
      description="Crea una cuenta nueva y, si aplica, asígnala como moderador."
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
          <Input label="Nombre" required value={form.nombre} onChange={set('nombre')} />
          <Input label="Apellido" required value={form.apellido} onChange={set('apellido')} />
          <Input label="Correo" required type="email" value={form.email} onChange={set('email')} placeholder="email@ejemplo.com" />
          <Input
            label="Contraseña"
            required
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            placeholder="Mínimo 6 caracteres"
            helperText="Entre 6 y 32 caracteres"
          />
          <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} placeholder="3001234567" />
          <Select label="Rol" required value={form.rol} onChange={set('rol')}>
            <option value="cliente">Cliente</option>
            <option value="conductor">Conductor</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="option-panel">
          <label className="check">
            <input type="checkbox" checked={form.esModerador} onChange={set('esModerador')} />
            Asignar como moderador
          </label>
          {form.esModerador && (
            <Select
              label="Zona del moderador"
              value={form.zonaModerador}
              onChange={set('zonaModerador')}
              helperText="El moderador solo verá y gestionará conductores de su ciudad."
            >
              {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </Select>
          )}
        </div>
      </div>
    </Modal>
  );
}
