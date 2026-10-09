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
