import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { getDisputes, resolveDispute } from '../../api/admin';

const theme = {
  bg: '#020208',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

const styles = {
  page: {
    padding: 32,
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text,
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: theme.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: theme.muted,
    margin: '4px 0 0',
  },
  filterBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  filterBtn: {
    padding: '8px 18px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: 'transparent',
    color: theme.muted,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterBtnActive: {
    backgroundColor: `${theme.accent}20`,
    color: theme.accent,
    borderColor: `${theme.accent}50`,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  badgePending: {
    backgroundColor: `${theme.warning}20`,
    color: theme.warning,
  },
  badgeResolved: {
    backgroundColor: `${theme.success}20`,
    color: theme.success,
  },
  detailBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: `${theme.muted}20`,
    color: theme.muted,
  },
  resolveBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: `${theme.accent}20`,
    color: theme.accent,
  },
  actionsCell: {
    display: 'flex',
    gap: 8,
    flexWrap: 'nowrap',
  },
  errorBanner: {
    padding: '16px 20px',
    borderRadius: 10,
    backgroundColor: `${theme.danger}15`,
    border: `1px solid ${theme.danger}40`,
    color: theme.danger,
    fontSize: 14,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 14,
  },
  detailCard: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: 14,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 6px',
  },
  detailValue: {
    fontSize: 14,
    color: theme.text,
    margin: 0,
    wordBreak: 'break-word',
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    padding: 14,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
    marginBottom: 8,
    display: 'block',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.bg,
    color: theme.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  submitBtn: {
    marginTop: 16,
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: theme.accent,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: theme.text,
    margin: '20px 0 12px',
    paddingTop: 16,
    borderTop: `1px solid ${theme.border}`,
  },
  typeBadge: {
    display: 'inline-flex',
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
};

const disputeTypeColors = {
  cancellation: { bg: `${theme.danger}20`, color: theme.danger },
  no_show: { bg: `${theme.warning}20`, color: theme.warning },
  fare: { bg: `${theme.accent}20`, color: theme.accent },
  route: { bg: `${theme.success}20`, color: theme.success },
  behavior: { bg: '#a855f720', color: '#a855f7' },
};

const disputeTypeLabels = {
  cancellation: 'Cancelación',
  no_show: 'No presentado',
  fare: 'Tarifa',
  route: 'Ruta',
  behavior: 'Comportamiento',
};

function StatusBadge({ status }) {
  const isResolved = status === 'resolved';
  return (
    <span
      style={{
        ...styles.badge,
        ...(isResolved ? styles.badgeResolved : styles.badgePending),
      }}
    >
      {isResolved ? 'Resuelto' : 'Pendiente'}
    </span>
  );
}

function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [detailModal, setDetailModal] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [resultado, setResultado] = useState('favor_conductor');
  const [acuerdoDePago, setAcuerdoDePago] = useState(false);
  const [montoDeuda, setMontoDeuda] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDisputes();
      setDisputes(Array.isArray(res.data) ? res.data : (res.data.data || res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las disputas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return disputes;
    return disputes.filter((d) => d.status === filter);
  }, [disputes, filter]);

  const counts = useMemo(() => ({
    all: disputes.length,
    pending: disputes.filter((d) => d.status === 'pending').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
  }), [disputes]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    setSubmitting(true);
    try {
      // Doc §18: PUT {resultado:"favor_conductor"|"favor_cliente", acuerdoDePago?, montoDeuda?}
      const payload = { resultado };
      if (acuerdoDePago) payload.acuerdoDePago = true;
      if (montoDeuda !== '' && !isNaN(Number(montoDeuda))) payload.montoDeuda = Number(montoDeuda);
      await resolveDispute(resolveModal.id || resolveModal._id, payload);
      await fetchDisputes();
      setResolveModal(null);
      setResultado('favor_conductor');
      setAcuerdoDePago(false);
      setMontoDeuda('');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Error al resolver la disputa');
    } finally {
      setSubmitting(false);
    }
  };

  const openResolve = (row) => {
    setResolveModal(row);
    setResultado('favor_conductor');
    setAcuerdoDePago(false);
    setMontoDeuda('');
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (val) => (
        <span style={{ fontSize: 12, color: theme.muted }}>#{String(val).slice(0, 8)}</span>
      ),
    },
    {
      key: 'tripId',
      label: 'Viaje',
      render: (val, row) => (
        <span style={{ fontWeight: 600 }}>
          {val || row.trip?.id ? `#${String(val || row.trip?.id).slice(0, 8)}` : '—'}
        </span>
      ),
    },
    {
      key: 'claimant',
      label: 'Reclamante',
      render: (val, row) => (
        <span>{val || row.claimant?.name || row.user?.name || '—'}</span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (val) => {
        const colors = disputeTypeColors[val] || { bg: `${theme.muted}20`, color: theme.muted };
        return (
          <span style={{ ...styles.typeBadge, backgroundColor: colors.bg, color: colors.color }}>
            {disputeTypeLabels[val] || val || '—'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (_, row) => (
        <div style={styles.actionsCell}>
          <button
            style={styles.detailBtn}
            onClick={(e) => {
              e.stopPropagation();
              setDetailModal(row);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.muted}40`;
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.muted}20`;
              e.currentTarget.style.color = theme.muted;
            }}
          >
            Ver Detalles
          </button>
          {row.status !== 'resolved' && (
            <button
              style={styles.resolveBtn}
              onClick={(e) => {
                e.stopPropagation();
                openResolve(row);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.accent;
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${theme.accent}20`;
                e.currentTarget.style.color = theme.accent;
              }}
            >
              Resolver
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderDetailFields = (row) => (
    <div style={styles.detailGrid}>
      <div style={styles.detailCard}>
        <p style={styles.detailLabel}>ID Disputa</p>
        <p style={styles.detailValue}>#{String(row.id).slice(0, 8)}</p>
      </div>
      <div style={styles.detailCard}>
        <p style={styles.detailLabel}>Viaje</p>
        <p style={styles.detailValue}>
          {row.tripId || row.trip?.id ? `#${String(row.tripId || row.trip?.id).slice(0, 8)}` : '—'}
        </p>
      </div>
      <div style={styles.detailCard}>
        <p style={styles.detailLabel}>Reclamante</p>
        <p style={styles.detailValue}>{row.claimant || row.claimant?.name || row.user?.name || '—'}</p>
      </div>
      <div style={styles.detailCard}>
        <p style={styles.detailLabel}>Tipo</p>
        <p style={styles.detailValue}>{disputeTypeLabels[row.type] || row.type || '—'}</p>
      </div>
      <div style={styles.detailCard}>
        <p style={styles.detailLabel}>Estado</p>
        <StatusBadge status={row.status} />
      </div>
      <div style={styles.detailCard}>
        <p style={styles.detailLabel}>Fecha</p>
        <p style={styles.detailValue}>
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—'}
        </p>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Disputas</h1>
          <p style={styles.subtitle}>Gestiona las disputas entre conductores y pasajeros</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠</span>
          <span>{error}</span>
          <button
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: theme.danger,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
            }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div style={styles.filterBar}>
        {[
          { key: 'all', label: 'Todas' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'resolved', label: 'Resueltas' },
        ].map((f) => (
          <button
            key={f.key}
            style={{
              ...styles.filterBtn,
              ...(filter === f.key ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f.key)}
            onMouseEnter={(e) => {
              if (filter !== f.key) {
                e.currentTarget.style.borderColor = theme.muted;
                e.currentTarget.style.color = theme.text;
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== f.key) {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.color = theme.muted;
              }
            }}
          >
            {f.label}
            <span style={{ marginLeft: 8, opacity: 0.6 }}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No hay disputas para mostrar"
      />

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Detalles de Disputa"
        size="lg"
      >
        {detailModal && (
          <div>
            {renderDetailFields(detailModal)}

            {detailModal.description && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.label}>Descripción de la Disputa</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.7, color: theme.muted }}>
                  {detailModal.description}
                </p>
              </div>
            )}

            {detailModal.evidence && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.label}>Evidencia</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.7, color: theme.muted }}>
                  {detailModal.evidence}
                </p>
              </div>
            )}

            {detailModal.resolution && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.label}>Resolución</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.7 }}>
                  {detailModal.resolution}
                </p>
                {detailModal.winner && (
                  <p style={{ ...styles.detailValue, marginTop: 8, fontWeight: 600, color: theme.accent }}>
                    Ganador: {detailModal.winner === 'claimant'
                      ? detailModal.claimant || detailModal.claimant?.name
                      : detailModal.respondent || detailModal.respondent?.name}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={!!resolveModal}
        onClose={() => {
          setResolveModal(null);
          setResultado('favor_conductor');
          setAcuerdoDePago(false);
          setMontoDeuda('');
        }}
        title="Resolver Disputa"
        size="md"
      >
        {resolveModal && (
          <div>
            {renderDetailFields(resolveModal)}

            <div style={{ marginTop: 20 }}>
              <label style={styles.label}>Resultado *</label>
              <select
                style={styles.select}
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
              >
                <option value="favor_conductor">Favor Conductor</option>
                <option value="favor_cliente">Favor Cliente</option>
              </select>
            </div>

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="acuerdoDePago"
                checked={acuerdoDePago}
                onChange={(e) => setAcuerdoDePago(e.target.checked)}
              />
              <label htmlFor="acuerdoDePago" style={{ ...styles.label, marginBottom: 0 }}>Acuerdo de pago</label>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={styles.label}>Monto deuda (opcional)</label>
              <input
                type="number"
                min="0"
                style={styles.select}
                value={montoDeuda}
                onChange={(e) => setMontoDeuda(e.target.value)}
                placeholder="Ej: 15000"
              />
            </div>

            <button
              style={styles.submitBtn}
              onClick={handleResolve}
              disabled={submitting}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {submitting ? 'Resolviendo...' : 'Confirmar Resolución'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DisputesPage;
