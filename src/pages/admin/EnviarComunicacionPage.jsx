import { useState } from 'react';
import { sendComunicacion } from '../../api/admin';
import { errorMessage } from '../../utils/format';
import { useZonas } from '../../hooks/useZonas';
import { PageHeader, Select, Input, Textarea, Alert, Button, Card } from '../../components/ui';

export default function EnviarComunicacionPage() {
  const zonas = useZonas();
  const [destino, setDestino] = useState('conductores');
  const [zona, setZona] = useState('');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    try {
      setEnviando(true);
      setError(null);
      setOk(null);
      const { data } = await sendComunicacion({ titulo, mensaje, destino, ...(zona ? { zona } : {}) });
      setOk(`Enviado a ${data.destinatarios} destinatario(s); ${data.conPush} con notificación push.`);
      setTitulo('');
      setMensaje('');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar la comunicación'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Enviar comunicación"
        description="Envía un mensaje propio de gerencia a los conductores o a los moderadores, de una zona o de todas."
      />
      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {ok && <Alert variant="success" onClose={() => setOk(null)}>{ok}</Alert>}
      <Card>
        <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
          <Select label="Para" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="conductores">Conductores</option>
            <option value="moderadores">Moderadores</option>
          </Select>
          <Select label="Zona" value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
          </Select>
          <Input label="Título" value={titulo} maxLength={100} required onChange={(e) => setTitulo(e.target.value)} />
          <Textarea label="Mensaje" value={mensaje} maxLength={1000} required onChange={(e) => setMensaje(e.target.value)} />
          <div>
            <Button type="submit" disabled={enviando || !titulo.trim() || !mensaje.trim()}>
              {enviando ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
