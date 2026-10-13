import { Badge } from '../../../components/ui';
import { timeAgo } from '../../../utils/format';
import { CONNECTION, connectionKey } from './driverUtils';

/** Verde = conectado con señal; amarillo = conectado sin señal ("hace X min"); gris = desconectado. */
export function ConnectionBadge({ driver }) {
  const key = connectionKey(driver);
  const [label, variant] = CONNECTION[key];
  const hace = key === 'sin_senal' && driver.ultimaSenalAt ? ` · ${timeAgo(driver.ultimaSenalAt).toLowerCase()}` : '';
  return (
    <Badge variant={variant}>
      <span className="badge__dot" aria-hidden="true" />
      {label}{hace}
    </Badge>
  );
}

export function VerificationBadge({ driver }) {
  const v = driver.estadoVerificacion || 'pendiente';
  let label = 'Pendiente';
  let variant = 'warning';
  if (v === 'aprobado' || v === 'verificado') { label = 'Verificado'; variant = 'success'; }
  else if (v === 'rechazado') { label = 'Rechazado'; variant = 'danger'; }
  return <Badge variant={variant}>{label}</Badge>;
}
