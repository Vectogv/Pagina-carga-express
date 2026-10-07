import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { getReferidos, anularReferido } from '../../api/admin';
import { errorMessage, formatDate, formatCurrency, toList } from '../../utils/format';
import { PageHeader, DataTable, ConfirmDialog, StatusBadge, Button } from '../../components/ui';

// GET /api/admin/referidos -> {referidos, comisionNoCobradaMes, topeMensualPesos}
export default function ReferidosPage() {
  const [rows, setRows] = useState([]);
  const [resumen, setResumen] = useState({ comisionNoCobradaMes: 0, topeMensualPesos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReferidos();
      const d = res.data?.data || res.data || {};
      setRows(toList(d, 'referidos'));
      setResumen({ comisionNoCobradaMes: d.comisionNoCobradaMes || 0, topeMensualPesos: d.topeMensualPesos || 0 });
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar los referidos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConfirm = async () => {
    try {
      await anularReferido(confirm.id);
      setConfirm(null);
      await fetchData();
    } catch (err) {
      setConfirm(null);
      setError(errorMessage(err, 'Error al anular el referido'));
    }
  };

  const columns = [
    {
      key: 'referidor',
      label: 'Referidor',
      render: (v) => (
        <div className="cell-user__text">
          <span className="text-strong">{v?.nombre || '—'}</span>
          <span className="cell-user__meta text-mono">{v?.codigo || ''}</span>
        </div>
      ),
    },
    { key: 'invitado', label: 'Invitado', render: (v) => v?.nombre || '—' },
    { key: 'estado', label: 'Estado', render: (v) => <StatusBadge status={v} /> },
    { key: 'viajes', label: 'Progreso', render: (v, row) => `${v ?? 0} de ${row.meta ?? 0}` },
    { key: 'venceEn', label: 'Vence', render: (v) => <span className="text-muted nowrap">{formatDate(v)}</span> },
    {
      key: 'cupones',
      label: 'Cupones',
      render: (v) => (v?.length
        ? v.map((c, i) => (
          <div key={i} className="text-muted">
            {c.tipo} {c.pct}% · {c.usosRestantes} usos · {c.estado}
          </div>
        ))
        : '—'),
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, row) => row.estado !== 'anulado' && (
        <Button size="sm" variant="soft-danger" icon={<X size={14} />} onClick={() => setConfirm(row)}>
          Anular
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Referidos"
        description={`Comisión no cobrada este mes: ${formatCurrency(resumen.comisionNoCobradaMes)} de ${formatCurrency(resumen.topeMensualPesos)}`}
      />

      {error && (
        <div className="page-error" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={() => setError(null)}>Cerrar</Button>
        </div>
      )}

      <DataTable columns={columns} data={rows} loading={loading} emptyMessage="Todavía no hay referidos" />

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title="Anular referido"
        message={`¿Anular el referido de ${confirm?.invitado?.nombre || 'este conductor'}? Se cancelan sus cupones y no se puede deshacer.`}
        confirmText="Anular"
        danger
      />
    </div>
  );
}
