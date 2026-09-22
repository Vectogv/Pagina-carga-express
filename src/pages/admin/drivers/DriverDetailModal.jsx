import { Avatar, Modal } from '../../../components/ui';
import { ciudadLabel, driverName } from './driverUtils';
import { ConnectionBadge, VerificationBadge } from './DriverBadges';
import '../users/users.css';

export default function DriverDetailModal({ driver, onClose }) {
  const u = driver.usuario || {};
  const name = driverName(driver);
  const items = [
    ['Placa', driver.placa || '—'],
    ['Tipo de vehículo', driver.tipoVehiculo || '—'],
    ['Ciudad', ciudadLabel(driver.ciudad)],
    ['Capacidad', driver.capacidad || '—'],
    ['Calificación', `${driver.calificacion || '0.0'} / 5`],
    ['Viajes', driver.totalViajes ?? 0],
    ['Teléfono', u.telefono || '—'],
  ];

  return (
    <Modal isOpen onClose={onClose} title="Detalle del conductor" size="md">
      <div className="profile-head">
        <Avatar src={driver.fotoConductor} name={name} size={72} />
        <span className="text-strong">{name}</span>
        <span className="text-sm text-muted">{u.email || '—'}</span>
        <div className="row">
          <ConnectionBadge driver={driver} />
          <VerificationBadge driver={driver} />
        </div>
      </div>
      <div className="detail-list">
        {items.map(([label, value]) => (
          <div key={label} className="detail-list__item">
            <span className="detail-list__label">{label}</span>
            <span className="detail-list__value">{value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
