import { useState } from 'react';
import { Alert, Button, Input, Modal } from '../ui';
import { errorMessage } from '../../utils/format';

/** Pide un correo y llama a `enviar(email)`. `email` vacío = el servidor usa el predeterminado. */
export default function EnviarCorreoModal({ titulo, descripcion, emailInicial = '', enviar, onClose, notify }) {
  const [email, setEmail] = useState(emailInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const valido = /^\S+@\S+\.\S+$/.test(email.trim());

  const mandar = async () => {
    setEnviando(true);
    setError('');
    try {
      await enviar(email.trim());
      notify(`Correo enviado a ${email.trim()}`);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar el correo'));
      setEnviando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={titulo}
      description={descripcion}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valido} loading={enviando} onClick={mandar}>Enviar</Button>
        </>
      )}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      <Input label="Correo de destino" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
    </Modal>
  );
}
