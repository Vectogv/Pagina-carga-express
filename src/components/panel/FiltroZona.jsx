import { Select } from '../ui';
import { useZonas } from '../../hooks/useZonas';

/** Selector de zona con "Todas las zonas" (value ''). props: { value, onChange(value), label? } */
export default function FiltroZona({ value, onChange, label }) {
  const zonas = useZonas();
  return (
    <Select label={label} value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label={label || 'Zona'}>
      <option value="">Todas las zonas</option>
      {zonas.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
    </Select>
  );
}
