import { useState, useEffect } from 'react';
import { Modal, Button, Select, Input } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import { DisputeSummary } from './DisputeParts';
import { money } from './disputeUtils';

/**
 * Formulario de resolución. PUT /api/admin/disputes/:id/resolve espera exactamente
 * {resultado:"favor_conductor"|"favor_cliente", acuerdoDePago?, montoDeuda?}
 * (admin_controller.ts#resolveDispute). El acuerdo de pago y el monto de deuda solo
 * aplican cuando el resultado es a favor del conductor.
 * Se monta con `key` distinto por disputa, así el formulario arranca limpio cada vez.
 */
export default function ResolveDisputeModal({ dispute, onClose, onSubmit }) {
  const [resultado, setResultado] = useState('favor_conductor');
  const [acuerdoDePago, setAcuerdoDePago] = useState(false);
  const [montoDeuda, setMontoDeuda] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Prellenar el monto de la deuda con el monto final del viaje cuando se activa el acuerdo de pago.
  useEffect(() => {
    if (acuerdoDePago && montoDeuda === '' && money(dispute) != null) {
      setMontoDeuda(String(money(dispute)));
    }
    // Solo debe prellenar una vez, al activar el acuerdo de pago; no en cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acuerdoDePago, dispute]);

  const handleResultadoChange = (e) => {
    const value = e.target.value;
    setResultado(value);
    if (value !== 'favor_conductor') {
      setAcuerdoDePago(false);
      setMontoDeuda('');
    }
  };

  const handleSubmit = async () => {
    const payload = { resultado };
    if (resultado === 'favor_conductor' && acuerdoDePago) {
      payload.acuerdoDePago = true;
      if (montoDeuda !== '' && !Number.isNaN(Number(montoDeuda))) payload.montoDeuda = Number(montoDeuda);
    }
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
          <DisputeSummary row={dispute} />
          <hr className="divider" />
          {error && <div className="page-error" role="alert">{error}</div>}
          <div className="form-grid">
            <Select label="Resultado" required value={resultado} onChange={handleResultadoChange}>
              <option value="favor_conductor">A favor del conductor</option>
              <option value="favor_cliente">A favor del cliente</option>
            </Select>

            {resultado === 'favor_conductor' && (
              <>
                <label className="dispute-check form-grid__full">
                  <input type="checkbox" checked={acuerdoDePago} onChange={(e) => setAcuerdoDePago(e.target.checked)} />
                  Generar acuerdo de pago (deuda del cliente)
                </label>
                {acuerdoDePago && (
                  <Input
                    label="Monto de la deuda"
                    type="number"
                    min="0"
                    value={montoDeuda}
                    onChange={(e) => setMontoDeuda(e.target.value)}
                    placeholder="Ej: 15000"
                    helperText="Prellenado con el monto final del viaje. El cliente tendrá 10 días para pagar."
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
