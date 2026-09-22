import { useState, useEffect, useCallback } from 'react';
import { getMyReports } from '../../api/moderator';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { errorMessage, formatDateTime, fullName, toList } from '../../utils/format';
import { PageHeader, DataTable, StatusBadge } from '../../components/ui';

const conductorName = (r) => {
  if (typeof r.conductor === 'string') return r.conductor;
  if (r.conductor) return fullName(r.conductor);
  if (r.conductorName) return r.conductorName;
  if (r.driver) return fullName(r.driver);
  return '—';
};

export default function NotificacionesPage() {
  const { ciudadParams } = useModeratorCity();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await getMyReports({ page: 1, limit: 50, ...ciudadParams });
      setReports(toList(res.data, 'reports'));
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar tus reportes'));
    } finally {
      setLoading(false);
    }
  }, [ciudadParams]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => {
    const id = setInterval(fetchReports, 60000);
    return () => clearInterval(id);
  }, [fetchReports]);

  const columns = [
    { key: 'fecha', label: 'Fecha', render: (v, r) => <span className="nowrap">{formatDateTime(r.createdAt || v)}</span> },
    { key: 'conductor', label: 'Conductor', render: (_, r) => <span className="text-strong">{conductorName(r)}</span> },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (v, r) => <span className="text-secondary">{v || r.description || r.contenido || r.content || '—'}</span>,
    },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v || 'abierta'} /> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Mis reportes"
        description="Reportes que enviaste al administrador. Se actualizan al entrar y cada minuto."
      />

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        emptyMessage="Aún no has enviado reportes"
        emptyDescription="Los reportes que hagas desde Conductores aparecerán aquí."
      />
    </div>
  );
}
