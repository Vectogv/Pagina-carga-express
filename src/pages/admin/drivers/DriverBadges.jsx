import { Badge } from '../../../components/ui';
import { CONNECTION, connectionKey } from './driverUtils';

export function ConnectionBadge({ driver }) {
  const [label, variant] = CONNECTION[connectionKey(driver)];
  return (
    <Badge variant={variant}>
      <span className="badge__dot" aria-hidden="true" />
      {label}
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
