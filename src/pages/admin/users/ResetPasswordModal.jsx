import { useState } from 'react';
import { Alert, Avatar, Button, Input, Modal } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import './users.css';

/**
 * Modal para resetear la contraseña de un usuario/conductor.
 * Montar solo cuando esté abierto para reiniciar el formulario en cada apertura.
 * onSubmit(password) debe lanzar si falla.
 */
export default function ResetPasswordModal({ name, email, avatar, onClose, onSubmit }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!password || password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    if (password !== confirm) return setError('Las contraseñas no coinciden');
    setError(null);
    setSaving(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(errorMessage(err, 'Error al cambiar contraseña'));
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Resetear contraseña"
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Guardar contraseña</Button>
        </>
      )}
    >
      <div className="stack">
        <div className="subject">
          <Avatar src={avatar} name={name} />
          <div className="cell-user__text">
            <span className="cell-user__name">{name || '—'}</span>
            <span className="cell-user__meta">{email || '—'}</span>
          </div>
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite la contraseña"
        />
      </div>
    </Modal>
  );
}
