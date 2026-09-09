import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/admin/Header';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { getTrips } from '../../api/admin';

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
    minHeight: '100vh',
    backgroundColor: theme.bg,
    color: theme.text,
  },
  content: {
    padding: 16,
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
    whiteSpace: 'nowrap',
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.cards,
    color: theme.text,
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  filterInput: {
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.cards,
    color: theme.text,
    fontSize: 13,
    outline: 'none',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    padding: '14px 20px',
    backgroundColor: theme.cards,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
  },
  pageInfo: {
    fontSize: 13,
    color: theme.muted,
  },
  pageButtons: {
    display: 'flex',
    gap: 8,
  },
  pageBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    backgroundColor: 'transparent',
    color: theme.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pageBtnActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
    color: '#fff',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  routeCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
  },
  routeArrow: {
    color: theme.muted,
    fontSize: 12,
  },
  priceText: {
    fontWeight: 600,
    fontSize: 13,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: theme.text,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottom: `1px solid ${theme.border}`,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  detailValue: {
    fontSize: 13,
    color: theme.text,
  },
  routeVisual: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    backgroundColor: `${"#020208"}80`,
    borderRadius: 12,
    marginBottom: 20,
  },
  routePoint: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    marginBottom: 4,
  },
  routeLine: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.muted,
    fontSize: 20,
    letterSpacing: 4,
  },
  participantCard: {
    padding: 12,
    backgroundColor: `${"#020208"}60`,
    borderRadius: 8,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text,
  },
  participantDetail: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
};

const statusConfig = {
  pendiente: { color: theme.warning, label: 'Pendiente' },
  pending: { color: theme.warning, label: 'Pendiente' },
  activo: { color: '#3b82f6', label: 'Activo' },
  active: { color: '#3b82f6', label: 'Activo' },
  completado: { color: theme.success, label: 'Completado' },
  completed: { color: theme.success, label: 'Completado' },
  cancelado: { color: theme.danger, label: 'Cancelado' },
  cancelled: { color: theme.danger, label: 'Cancelado' },
};

function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [detailModal, setDetailModal] = useState({ open: false, trip: null });

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit, search };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await getTrips(params);
      const d = res.data;
      const list = Array.isArray(d) ? d : (d.trips || d.data || []);
      setTrips(list);
      setTotal(Array.isArray(d) ? list.length : (d.total || list.length));
      setTotalPages(Array.isArray(d) ? 1 : (d.totalPages || 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar viajes');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTrips();
  }, [page, search, statusFilter, dateFrom, dateTo]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleDateFrom = (val) => {
    setDateFrom(val);
    setPage(1);
  };

  const handleDateTo = (val) => {
    setDateTo(val);
    setPage(1);
  };

  const getStatusBadge = (status) => {
    const s = statusConfig[status] || { color: theme.muted, label: status || 'Desconocido' };
    return (
      <span style={{ ...styles.badge, backgroundColor: `${s.color}20`, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val) => {
    if (val == null) return '-';
    return `$${Number(val).toLocaleString('es-CO')}`;
  };

  const shortId = (trip) => {
    const id = trip.id || trip._id || '';
    return typeof id === 'string' ? id.slice(-6).toUpperCase() : String(id).slice(-6);
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (_, trip) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: theme.accent, fontWeight: 600 }}>
          #{shortId(trip)}
        </span>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_, trip) => {
        const client = trip.cliente || trip.client || trip.passenger;
        if (!client) return '-';
        return client.nombre || client.name || client.email || '-';
      },
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (_, trip) => {
        const driver = trip.conductor || trip.driver;
        if (!driver) return '-';
        return driver.nombre || driver.name || driver.email || '-';
      },
    },
    {
      key: 'ruta',
      label: 'Origen → Destino',
      render: (_, trip) => {
        const origin = trip.origen || trip.origin || trip?.pickup || '-';
        const dest = trip.destino || trip.destination || '-';
        return (
          <div style={styles.routeCell}>
            <span>{typeof origin === 'string' ? origin.slice(0, 18) : origin}</span>
            <span style={styles.routeArrow}>→</span>
            <span>{typeof dest === 'string' ? dest.slice(0, 18) : dest}</span>
          </div>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (_, trip) => getStatusBadge(trip.estado || trip.status),
    },
    {
      key: 'precio',
      label: 'Precio',
      render: (_, trip) => (
        <span style={{ ...styles.priceText, color: theme.success }}>
          {formatCurrency(trip.precio || trip.price || trip.fare)}
        </span>
      ),
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (_, trip) => (
        <span style={{ fontSize: 13, color: theme.muted }}>
          {formatDate(trip.fecha || trip.date || trip.createdAt)}
        </span>
      ),
    },
  ];

  const trip = detailModal.trip;
  const client = trip?.cliente || trip?.client || trip?.passenger;
  const driver = trip?.conductor || trip?.driver;
  const origin = trip?.origen || trip?.origin || '-';
  const destination = trip?.destino || trip?.destination || '-';
  const tripStatus = trip?.estado || trip?.status;
  const sc = statusConfig[tripStatus] || { color: theme.muted, label: tripStatus };

  return (
    <div style={styles.page}>
      <Header title="Viajes" onSearch={handleSearch} />
      <div style={styles.content}>
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Estado:</span>
            <select
              style={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="activo">Activo</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Desde:</span>
            <input
              type="date"
              style={styles.filterInput}
              value={dateFrom}
              onChange={(e) => handleDateFrom(e.target.value)}
            />
          </div>
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>Hasta:</span>
            <input
              type="date"
              style={styles.filterInput}
              value={dateTo}
              onChange={(e) => handleDateTo(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: `${theme.danger}15`, color: theme.danger, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={trips}
          loading={loading}
          emptyMessage="No se encontraron viajes"
          onRowClick={(row) => setDetailModal({ open: true, trip: row })}
        />

        {total > 0 && (
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Pagina {page} de {totalPages} ({total} viajes)
            </span>
            <div style={styles.pageButtons}>
              <button
                style={{ ...styles.pageBtn, ...(page <= 1 ? styles.pageBtnDisabled : {}) }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    style={{ ...styles.pageBtn, ...(p === page ? styles.pageBtnActive : {}) }}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                style={{ ...styles.pageBtn, ...(page >= totalPages ? styles.pageBtnDisabled : {}) }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, trip: null })}
        title="Detalle del Viaje"
        size="md"
      >
        {trip && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: theme.accent }}>
                #{shortId(trip)}
              </span>
              {getStatusBadge(tripStatus)}
            </div>

            <div style={styles.routeVisual}>
              <div style={styles.routePoint}>
                <div style={{ ...styles.routeDot, backgroundColor: theme.accent }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.muted }}>ORIGEN</span>
                <span style={{ fontSize: 13, color: theme.text }}>{typeof origin === 'string' ? origin : '-'}</span>
              </div>
              <div style={styles.routeLine}>• • •</div>
              <div style={styles.routePoint}>
                <div style={{ ...styles.routeDot, backgroundColor: theme.success }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.muted }}>DESTINO</span>
                <span style={{ fontSize: 13, color: theme.text }}>{typeof destination === 'string' ? destination : '-'}</span>
              </div>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailTitle}>Participantes</div>
              <div style={styles.detailGrid}>
                <div style={styles.participantCard}>
                  <div style={styles.participantName}>{client?.nombre || client?.name || 'Sin cliente'}</div>
                  <div style={styles.participantDetail}>{client?.email || '-'}</div>
                  <div style={styles.participantDetail}>{client?.telefono || client?.phone || '-'}</div>
                </div>
                <div style={styles.participantCard}>
                  <div style={styles.participantName}>{driver?.nombre || driver?.name || 'Sin conductor'}</div>
                  <div style={styles.participantDetail}>{driver?.email || '-'}</div>
                  <div style={styles.participantDetail}>{driver?.telefono || driver?.phone || '-'}</div>
                </div>
              </div>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailTitle}>Informacion del Viaje</div>
              <div style={styles.detailGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Fecha</span>
                  <span style={styles.detailValue}>{formatDate(trip.fecha || trip.date || trip.createdAt)}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Estado</span>
                  <span style={styles.detailValue}>{sc.label}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Distancia</span>
                  <span style={styles.detailValue}>{trip.distancia || trip.distance || '-'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Duracion</span>
                  <span style={styles.detailValue}>{trip.duracion || trip.duration || '-'}</span>
                </div>
              </div>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailTitle}>Pago</div>
              <div style={styles.detailGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Precio</span>
                  <span style={{ ...styles.detailValue, color: theme.success, fontSize: 18, fontWeight: 700 }}>
                    {formatCurrency(trip.precio || trip.price || trip.fare)}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Metodo de Pago</span>
                  <span style={styles.detailValue}>{trip.metodoPago || trip.paymentMethod || '-'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Comision</span>
                  <span style={styles.detailValue}>{formatCurrency(trip.comision || trip.commission || 0)}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Propina</span>
                  <span style={styles.detailValue}>{formatCurrency(trip.propina || trip.tip || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TripsPage;
