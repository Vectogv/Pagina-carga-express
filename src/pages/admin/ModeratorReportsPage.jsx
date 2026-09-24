import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { getModeratorReports } from '../../api/admin';
import { errorMessage, formatDate, toList } from '../../utils/format';
import { PageHeader, DataTable, StatusBadge, Button } from '../../components/ui';

// El backend puede devolver `moderador` / `conductor` como objeto ({ nombre, placa }) o como texto.
const nameOf = (v) => (v && typeof v === 'object' ? v.nombre || v.name : v);

function ModeratorReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getModeratorReports();
      setReports(toList(res.data, 'reports'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar los reportes del moderador'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const columns = [
    {
      key: 'moderator',
      label: 'Moderador',
      render: (val, row) => (
        <span className="text-strong">{nameOf(val) || nameOf(row.moderador) || row.moderatorName || '—'}</span>
      ),
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (val) => {
        if (!val) return <span className="text-muted">—</span>;
        return (
          <div className="cell-user__text">
            <span>{nameOf(val) || '—'}</span>
            {val.placa && <span className="cell-user__meta text-mono">{val.placa}</span>}
          </div>
        );
      },
    },
    {
      key: 'descripcion',
      label: 'Contenido',
      render: (val, row) => {
        const text = val || row.descripcion || '';
        return (
          <span className="truncate text-secondary" style={{ display: 'inline-block', maxWidth: 320 }} title={text}>
            {text || '—'}
          </span>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (val) => <span className="nowrap">{formatDate(val)}</span>,
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Reportes de moderadores" description="Reportes enviados por los moderadores sobre conductores de su zona." />

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="icon" variant="ghost" onClick={() => setError(null)} aria-label="Cerrar mensaje">
            <X size={14} />
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        emptyMessage="No hay reportes de moderadores"
      />
    </div>
  );
}

export default ModeratorReportsPage;
