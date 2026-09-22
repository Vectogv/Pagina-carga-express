import { useState } from 'react';
import { Alert, Button, Modal, Select } from '../../../components/ui';
import { errorMessage, fullName } from '../../../utils/format';
import { setModerator } from '../../../api/admin';
import { getZonaModerador, userId } from './constants';
import { useZonas, zonaLabelFrom } from '../../../hooks/useZonas';
import './users.css';

/**
 * Asignar / modificar / quitar moderador.
 * Doc: PUT /api/admin/users/:id/moderator {esModerador, zonaModerador:"cali"|"popayan"|"pasto"}
 */
export default function ModeratorModal({ user, onClose, onSaved }) {
  const [esModerador, setEsModerador] = useState(!!user.esModerador);
  const ZONAS = useZonas();
  const zonaLabel = (z) => zonaLabelFrom(ZONAS, z);
  const [zonaRaw, setZona] = useState(getZonaModerador(user) || '');
  const zona = zonaRaw || ZONAS[0]?.value || '';
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await setModerator(userId(user), { esModerador, zonaModerador: zona });
      onSaved(esModerador ? 'Moderador actualizado' : 'Moderador retirado');
    } catch (err) {
      setError(errorMessage(err, 'Error al asignar moderador'));
      setSaving(false);
    }
  };

  let confirmLabel = 'Quitar moderador';
  if (esModerador) confirmLabel = user.esModerador ? 'Guardar cambios' : 'Asignar como moderador';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={user.esModerador ? 'Modificar moderador' : 'Asignar moderador'}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant={esModerador ? 'primary' : 'danger'} onClick={handleSave} loading={saving}>{confirmLabel}</Button>
        </>
      )}
    >
      <div className="stack">
        <div className="subject">
          <div className="cell-user__text">
            <span className="cell-user__name">{fullName(user)}</span>
            <span className="cell-user__meta">{user.email || '—'}</span>
            <span className="cell-user__meta">
              Actual: {user.esModerador ? `Moderador ${zonaLabel(getZonaModerador(user))}` : 'No es moderador'}
            </span>
          </div>
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        <label className="check">
          <input type="checkbox" checked={esModerador} onChange={(e) => setEsModerador(e.target.checked)} />
          Es moderador
        </label>
        <Select
          label="Zona"
          required={esModerador}
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          disabled={!esModerador}
          helperText={esModerador
            ? 'Para cambiar de ciudad, selecciona la nueva zona y guarda.'
            : 'Para quitar el rol, deja la casilla desmarcada y guarda.'}
        >
          {ZONAS.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </Select>
      </div>
    </Modal>
  );
}
