import { useState } from 'react';
import { Alert, Button, Input, Modal } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import { updateUser } from '../../../api/admin';
import { userId } from './constants';

/** Editar datos básicos. Doc §18: PUT /api/admin/users/:id {nombre,apellido,email,telefono,edad} */
export default function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: user.nombre || user.name || '',
    apellido: user.apellido || '',
    email: user.email || '',
    telefono: user.telefono || user.phone || '',
    edad: user.edad ?? '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    const payload = {};
    if (form.nombre.trim()) payload.nombre = form.nombre.trim();
    if (form.apellido.trim()) payload.apellido = form.apellido.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.telefono.trim()) payload.telefono = form.telefono.trim();
    if (form.edad !== '' && !Number.isNaN(Number(form.edad))) payload.edad = Number(form.edad);
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
          <Input label="Nombre" value={form.nombre} onChange={set('nombre')} />
          <Input label="Apellido" value={form.apellido} onChange={set('apellido')} />
          <Input label="Correo" type="email" value={form.email} onChange={set('email')} />
          <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} />
          <Input label="Edad" type="number" min="18" max="120" value={form.edad} onChange={set('edad')} placeholder="18–120" />
        </div>
      </div>
    </Modal>
  );
}
