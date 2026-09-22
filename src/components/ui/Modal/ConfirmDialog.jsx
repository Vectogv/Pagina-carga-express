import { useState } from 'react';
import { CircleHelp, TriangleAlert } from 'lucide-react';
import Modal from './Modal';
import Button from '../Button/Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  confirmDisabled = false,
  children,
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await onConfirm?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>{cancelText}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy} disabled={confirmDisabled}>
            {confirmText}
          </Button>
        </>
      )}
    >
      <div className="confirm">
        <div className={`confirm__icon ${danger ? 'confirm__icon--danger' : ''}`}>
          {danger ? <TriangleAlert size={20} /> : <CircleHelp size={20} />}
        </div>
        <div className="confirm__content">
          {message && <p className="confirm__message">{message}</p>}
          {children}
        </div>
      </div>
    </Modal>
  );
}
