import { useEffect, useRef, useState } from 'react';
import { getPlantillasCorreo, sendCorreo } from '../../api/correo';
import { errorMessage } from '../../utils/format';
import { Modal, Select, Input, Textarea, Button, Alert } from '../ui';
import VistaPreviaCorreo from './VistaPreviaCorreo';
import VariablesCorreo from './VariablesCorreo';

/**
 * Correo con la marca a un usuario (userId). Se elige una plantilla y se puede ajustar
 * el texto antes de enviar; las variables ({{nombre}}, {{placa}}…) usan los datos reales.
 */
export default function EnviarCorreoDialog({ area, userId, destinatario, onClose, onEnviado }) {
  const [plantillas, setPlantillas] = useState([]);
  const [variables, setVariables] = useState([]);
  const [clave, setClave] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const ultimo = useRef('cuerpo');
  // Solo el admin edita el texto; el moderador elige plantilla, previsualiza y envía.
  const puedeEditar = area === 'admin';

  useEffect(() => {
    getPlantillasCorreo(area)
      .then(({ data }) => {
        setPlantillas((data.data || []).filter((p) => p.activo));
        setVariables(data.variables || []);
      })
      .catch((err) => setError(errorMessage(err, 'No se pudieron cargar las plantillas')));
  }, [area]);

  const elegir = (c) => {
    setClave(c);
    const p = plantillas.find((x) => x.clave === c);
    if (p) { setAsunto(p.asunto); setCuerpo(p.cuerpo); }
  };

  const enviar = async () => {
    try {
      setEnviando(true);
      setError(null);
      const { data } = await sendCorreo(area, puedeEditar ? { userId, asunto, cuerpo, ...(clave ? { plantilla: clave } : {}) } : { userId, plantilla: clave });
      if (data.enviados > 0) {
        onEnviado?.(`Correo enviado a ${destinatario}`);
        onClose();
      } else {
        setError('No se envió: el usuario no tiene correo, se acabó el cupo del día o el servicio de correo falló.');
      }
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar el correo'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title="Enviar correo"
      description={`Para ${destinatario}. Sale con el logo y los colores de CargaExpress.`}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando || !asunto.trim() || !cuerpo.trim() || (!puedeEditar && !clave)}>
            {enviando ? 'Enviando...' : 'Enviar correo'}
          </Button>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
        <Select label="Plantilla" value={clave} onChange={(e) => elegir(e.target.value)}>
          <option value="">Elige una plantilla…</option>
          {plantillas.map((p) => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
        </Select>
        {puedeEditar ? (
          <>
            <Input id="correo-asunto" onFocus={() => { ultimo.current = 'asunto'; }} label="Asunto" value={asunto} maxLength={150} onChange={(e) => setAsunto(e.target.value)} />
            <Textarea id="correo-cuerpo" onFocus={() => { ultimo.current = 'cuerpo'; }} label="Mensaje" value={cuerpo} maxLength={5000} rows={6} onChange={(e) => setCuerpo(e.target.value)} />
            <VariablesCorreo
              variables={variables}
              ids={{ asunto: 'correo-asunto', cuerpo: 'correo-cuerpo' }}
              ultimo={ultimo}
              onInsert={(campo, fn) => (campo === 'asunto' ? setAsunto : setCuerpo)(fn)}
            />
          </>
        ) : (
          <span className="text-sm text-muted">El texto de la plantilla lo define gerencia; las variables se rellenan con los datos del conductor.</span>
        )}
        <VistaPreviaCorreo area={area} asunto={asunto} cuerpo={cuerpo} userId={userId} />
      </div>
    </Modal>
  );
}
