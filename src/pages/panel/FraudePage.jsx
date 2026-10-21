import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getModeratorFraude } from '../../api/moderator';
import { getAdminFraude } from '../../api/admin';
import { errorMessage, toList } from '../../utils/format';
import { PageHeader, DataTable, SegmentedFilter, Badge } from '../../components/ui';
import { FiltroZona } from '../../components/panel';

// Las 8 señales de fraude que calcula el servidor (3.3). Solo lectura: de aquí se va a la
// ficha del conductor o del cliente para sancionar (3.4).
export default function FraudePage({ area = 'moderator' }) {
  const [senales, setSenales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipo, setTipo] = useState('all');
  const [zona, setZona] = useState('');

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const fn = area === 'admin' ? getAdminFraude : getModeratorFraude;
      const res = await fn(zona ? { zona } : {});
      setSenales(toList(res.data?.senales ?? res.data));
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las señales de fraude'));
    } finally {
      setLoading(false);
    }
  }, [area, zona]);

  useEffect(() => { cargar(); }, [cargar]);

  const opciones = useMemo(() => {
    const cuenta = new Map();
    senales.forEach((s) => cuenta.set(s.tipo, { label: s.label, n: (cuenta.get(s.tipo)?.n || 0) + 1 }));
    return [{ value: 'all', label: 'Todas', count: senales.length },
      ...[...cuenta].map(([value, { label, n }]) => ({ value, label, count: n }))];
  }, [senales]);

  const filas = tipo === 'all' ? senales : senales.filter((s) => s.tipo === tipo);

  const persona = (id, nombre, ruta) => (id == null ? '—'
    : <Link to={`/${area}/${ruta}/${id}`}>{nombre || `#${id}`}</Link>);

  const columns = [
    { key: 'label', label: 'Señal', render: (v) => <Badge variant="warning">{v}</Badge> },
    { key: 'conductorId', label: 'Conductor', render: (v, s) => persona(v, s.conductorNombre, 'drivers') },
    { key: 'clienteId', label: 'Cliente', render: (v, s) => persona(v, s.clienteNombre, 'clients') },
    { key: 'valor', label: 'Valor / umbral', render: (v, s) => <span className="text-mono">{v} / {s.umbral}</span> },
    { key: 'detalle', label: 'Detalle', render: (v) => <span style={{ whiteSpace: 'normal' }}>{v}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Señales de fraude"
        description="Patrones sospechosos entre conductores y clientes. Revisa la ficha de la persona y, si hace falta, aplica una sanción."
      />
      {error && <div className="page-error" role="alert">{error}</div>}
      <div className="filters-row">
        <FiltroZona value={zona} onChange={setZona} />
        <SegmentedFilter options={opciones} value={tipo} onChange={setTipo} />
      </div>
      <DataTable columns={columns} data={filas} loading={loading && senales.length === 0} emptyMessage="No hay señales de fraude con los filtros actuales." />
    </div>
  );
}
