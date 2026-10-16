import { useState } from 'react';
import { ArchiveRestore } from 'lucide-react';
import { unarchiveUser } from '../../api/admin';
import { errorMessage } from '../../utils/format';
import { Button, ConfirmDialog, Toast, ToastContainer } from '../ui';

/** Botón "Restaurar cuenta": solo se ve si la cuenta está archivada (`archivadaAt`). Solo admin. */
export default function RestaurarCuenta({ userId, archivadaAt, nombre = 'la persona', onDone, size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  if (!archivadaAt || !userId) return null;

  const restaurar = async () => {
    try {
      await unarchiveUser(userId);
      setToast({ message: `Cuenta de ${nombre} restaurada.`, variant: 'success' });
      onDone?.();
    } catch (err) {
      setToast({ message: errorMessage(err, 'No se pudo restaurar la cuenta'), variant: 'error' });
    }
  };

  return (
    <>
      <Button size={size} variant="soft-primary" icon={<ArchiveRestore size={14} />} onClick={() => setOpen(true)}>
        Restaurar cuenta
      </Button>
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={restaurar}
        title="Restaurar cuenta"
        message={`¿Restaurar la cuenta de ${nombre}? La persona podrá volver a entrar con su misma contraseña.`}
        confirmText="Restaurar"
      />
      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </ToastContainer>
      )}
    </>
  );
}
