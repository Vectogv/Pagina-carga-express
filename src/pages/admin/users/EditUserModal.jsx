import { useState } from 'react';
import { Alert, Button, Input, Modal } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import { updateUser } from '../../../api/admin';
import { userId } from './constants';

/**
 * Editar datos básicos: PUT /api/admin/users/:id {nombre,apellido,email,telefono,edad}.
 *
 * Teléfono y edad se envían como null cuando se dejan en blanco, para poder borrar
 * el dato (antes se omitían del payload y el valor anterior quedaba intacto sin
 * que el admin se enterara).
 */
export default function EditUserModal({ user, onClose, onSaved }) {
  const inicial = {
    nombre: user.nombre || user.name || '',
    apellido: user.apellido || '',
    email: user.email || '',
    telefono: user.telefono || user.phone || '',
    edad: user.edad ?? '',
  };
  const [form, setForm] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrores((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  /** Mismas reglas que el backend. */
  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Obligatorio';
    else if (form.nombre.trim().length > 100) e.nombre = 'Máximo 100 caracteres';
    if (form.apellido.trim().length > 100) e.apellido = 'Máximo 100 caracteres';
    if (!form.email.trim()) e.email = 'Obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo no válido';
    if (form.telefono.trim().length > 20) e.telefono = 'Máximo 20 caracteres';
    if (form.edad !== '' && form.edad !== null) {
      const edad = Number(form.edad);
      if (!Number.isInteger(edad) || edad < 18 || edad > 120) e.edad = 'Entre 18 y 120 años';
    }
    return e;
  };

  const handleSave = async () => {
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) {
      setError('Revisa los campos marcados.');
      return;
    }
    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim() || null,
      edad: form.edad === '' ? null : Number(form.edad),
    };
    setSaving(true);
    setError(null);
    try {
      await updateUser(userId(user), payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, 'Error al actualizar usuario'));
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Editar usuario"
      description="El rol, la contraseña y el estado de la cuenta se cambian desde las acciones de la tabla."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Guardar cambios</Button>
        </>
      )}
    >
      <div className="stack">
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="form-grid">
          <Input label="Nombre" required autoFocus value={form.nombre} onChange={set('nombre')} error={errores.nombre} />
          <Input label="Apellido" value={form.apellido} onChange={set('apellido')} error={errores.apellido} />
          <Input label="Correo" required type="email" value={form.email} onChange={set('email')} error={errores.email} />
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={set('telefono')}
            helperText="Déjalo vacío para borrarlo"
            error={errores.telefono}
          />
          <Input
            label="Edad"
            type="number"
            min="18"
            max="120"
            value={form.edad}
            onChange={set('edad')}
            placeholder="18–120"
            error={errores.edad}
          />
        </div>
      </div>
    </Modal>
  );
}
