import { useState, useEffect, useCallback } from 'react';
import { getPendientes } from '../../api/admin';
import { errorMessage } from '../../utils/format';
import { useZonas } from '../../hooks/useZonas';
import { PageHeader, Select, Alert, LoadingState, Button } from '../../components/ui';
import PendientesResumen from './PendientesResumen';
import './PendientesPage.css';

export default function PendientesPage() {
  const zonas = useZonas();
  const [zona, setZona] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPendientes(zona ? { zona } : undefined);
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar los pendientes'));
    } finally {
      setLoading(false);
    }
  }, [zona]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="pend">
      <PageHeader
        title="Pendientes"
        description={data ? `${data.total} pendiente(s) en total` : 'Todo lo que los moderadores tienen por resolver'}
        actions={(
          <>
            <Select value={zona} onChange={(e) => setZona(e.target.value)} aria-label="Zona">
              <option value="">Todas las zonas</option>
              {zonas.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
            </Select>
            <Button variant="secondary" onClick={cargar}>Actualizar</Button>
          </>
        )}
      />
      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {loading && !data ? <LoadingState /> : data && (
        <>
          <PendientesResumen categorias={data.categorias} zonas={zonas} />
        </>
      )}
    </div>
  );
}
