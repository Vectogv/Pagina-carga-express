import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui';

/** Avatar 40 px + nombre en negrita + correo debajo. */
export function CeldaConductor({ r, name, to }) {
  return (
    <div className="cell-user">
      <Avatar src={r.fotoConductor || r.usuario?.avatar} name={name} size={40} />
      <div className="cell-user__text">
        {to ? <Link className="cell-user__name" to={to}>{name}</Link> : <span className="cell-user__name">{name}</span>}
        <span className="cell-user__meta">{r.usuario?.email || r.email || '—'}</span>
      </div>
    </div>
  );
}

/** Placa con estilo de placa y tipo de vehículo debajo. */
export function CeldaVehiculo({ r }) {
  if (!r.placa && !r.tipoVehiculo) return '—';
  return (
    <div className="cell-user__text">
      {r.placa ? <span className="plate">{r.placa}</span> : null}
      {r.tipoVehiculo ? <span className="cell-user__meta">{r.tipoVehiculo}</span> : null}
    </div>
  );
}
