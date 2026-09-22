import { useState } from 'react';
import { Modal, Button, Select, Input } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import { DisputeFields } from './DisputeParts';

/**
 * Formulario de resolución. Doc §18: PUT {resultado:"favor_conductor"|"favor_cliente", acuerdoDePago?, montoDeuda?}
 * Se monta con `key` distinto por disputa, así el formulario arranca limpio cada vez.
 */
export default function ResolveDisputeModal({ dispute, onClose, onSubmit }) {
  const [resultado, setResultado] = useState('favor_conductor');
  const [acuerdoDePago, setAcuerdoDePago] = useState(false);
  const [montoDeuda, setMontoDeuda] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    const payload = { resultado };
    if (acuerdoDePago) payload.acuerdoDePago = true;
    if (montoDeuda !== '' && !Number.isNaN(Number(montoDeuda))) payload.montoDeuda = Number(montoDeuda);
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(errorMessage(err, 'Error al resolver la disputa'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={!!dispute}
      onClose={submitting ? undefined : onClose}
      title="Resolver disputa"
      description="Define a favor de quién se resuelve y, si aplica, el acuerdo de pago."
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting}>Confirmar resolución</Button>
        </>
      )}
    >
      {dispute && (
        <div className="dispute-detail">
          <DisputeFields row={dispute} />
          <hr className="divider" />
          {error && <div className="page-error" role="alert">{error}</div>}
          <div className="form-grid">
            <Select label="Resultado" required value={resultado} onChange={(e) => setResultado(e.target.value)}>
              <option value="favor_conductor">A favor del conductor</option>
              <option value="favor_cliente">A favor del cliente</option>
            </Select>
            <Input
              label="Monto deuda (opcional)"
              type="number"
              min="0"
              value={montoDeuda}
              onChange={(e) => setMontoDeuda(e.target.value)}
              placeholder="Ej: 15000"
            />
            <label className="dispute-check form-grid__full">
              <input type="checkbox" checked={acuerdoDePago} onChange={(e) => setAcuerdoDePago(e.target.checked)} />
              Acuerdo de pago
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
