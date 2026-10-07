import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendientes } from '../../api/admin';
import { errorMessage, formatDate } from '../../utils/format';
import { useZonas, zonaLabelFrom } from '../../hooks/useZonas';
import { PageHeader, Select, Alert, LoadingState, StatCard, Card, Button } from '../../components/ui';

// Pantalla existente donde se resuelve cada categoría.
const DESTINO = {
  verificaciones: '/admin/verifications',
  soat: '/admin/verifications',
  disputas: '/admin/disputes',
  cierres: '/admin/trips',
  cancelaciones: '/admin/cancellation-requests',
  tickets: '/admin/tickets',
  emergencias: '/admin/emergencies',
  reportes: '/admin/reports',
  comunicados: '/admin/comunicados',
  pagos: '/admin/payments',
};

export default function PendientesPage() {
  const zonas = useZonas();
  const navigate = useNavigate();
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

  const categorias = data?.categorias || [];

  return (
    <div>
      <PageHeader
        title="Pendientes de revisar"
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
      {loading && !data ? <LoadingState /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {categorias.map((c) => (
            <div key={c.clave} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatCard title={c.titulo} value={c.total} to={DESTINO[c.clave]} />
              {c.total > 0 && (
                <Card>
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      {Object.entries(c.porZona).map(([z, n]) => (
                        <span key={z} style={{ marginRight: 10 }}>
                          <strong>{n}</strong> {z === 'sin_zona' ? 'Sin zona' : zonaLabelFrom(zonas, z)}
                        </span>
                      ))}
                    </div>
                    {c.items.map((i) => (
                      <div key={`${c.clave}-${i.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>{i.titulo}</span>
                        <span style={{ opacity: 0.6 }}>{i.createdAt ? formatDate(i.createdAt) : ''}</span>
                      </div>
                    ))}
                    {c.total > c.items.length && <span style={{ opacity: 0.6 }}>y {c.total - c.items.length} más</span>}
                    <Button variant="secondary" onClick={() => navigate(DESTINO[c.clave])}>Abrir</Button>
                  </div>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
