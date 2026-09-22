import { useState } from 'react';
import { Alert, Button, Input, Modal, Select } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import { updateUser, updateDriverCity } from '../../../api/admin';
import { driverUserId } from './driverUtils';
import { useZonas } from '../../../hooks/useZonas';

/** Edita datos del usuario (PUT /users/:usuarioId) y la ciudad del conductor (PUT /drivers/:id/city). */
export default function DriverEditModal({ driver, onClose, onSaved }) {
  const CIUDADES = useZonas();
  const u = driver.usuario || {};
  const [form, setForm] = useState({
    nombre: u.nombre || '',
    apellido: u.apellido || '',
    email: u.email || '',
    telefono: u.telefono || '',
    ciudad: driver.ciudad || '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      if (form.nombre.trim()) payload.nombre = form.nombre.trim();
      if (form.apellido.trim()) payload.apellido = form.apellido.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.telefono.trim()) payload.telefono = form.telefono.trim();
      if (Object.keys(payload).length) await updateUser(driverUserId(driver), payload);
      const ciudad = form.ciudad.trim().toLowerCase();
      if (ciudad && ciudad !== String(driver.ciudad || '').toLowerCase()) {
        await updateDriverCity(driver.id, { ciudad });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err, 'Error al editar'));
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Editar conductor"
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
          <Select label="Ciudad" value={form.ciudad} onChange={set('ciudad')}>
            <option value="">Selecciona ciudad</option>
            {CIUDADES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
      </div>
    </Modal>
  );
}
