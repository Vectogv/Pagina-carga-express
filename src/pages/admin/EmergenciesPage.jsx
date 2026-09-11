import { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { getEmergencies, resolveEmergency, getTripById, getEmergencyChat, sendEmergencyMessage } from '../../api/admin';

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

const pulseKeyframes = `
@keyframes emergencyPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

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
    gap: 6,
  },
  badgePending: {
    backgroundColor: `${theme.danger}20`,
    color: theme.danger,
    animation: 'emergencyPulse 2s ease-in-out infinite',
  },
  badgeResolved: {
    backgroundColor: `${theme.success}20`,
    color: theme.success,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    display: 'inline-block',
  },
  dotPending: {
    backgroundColor: theme.danger,
  },
  dotResolved: {
    backgroundColor: theme.success,
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
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.muted,
    marginBottom: 8,
    display: 'block',
  },
  textarea: {
    width: '100%',
    minHeight: 80,
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
};

function StatusBadge({ status }) {
  const isPending = status === 'pending';
  return (
    <span
      style={{
        ...styles.badge,
        ...(isPending ? styles.badgePending : styles.badgeResolved),
      }}
    >
      <span style={{ ...styles.dot, ...(isPending ? styles.dotPending : styles.dotResolved) }} />
      {isPending ? 'Pendiente' : 'Resuelta'}
    </span>
  );
}

function EmergenciesPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tripDetail, setTripDetail] = useState(null);
  const [chatMensajes, setChatMensajes] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  const fetchEmergencies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmergencies({ page: 1, limit: 100 });
      const d = res.data;
      const list = (Array.isArray(d) ? d : (d.data || d.emergencies || []));
      setEmergencies(list.map((e) => ({ ...e, status: e.atendida ? 'resolved' : 'pending' })));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar las emergencias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    const id = setInterval(fetchEmergencies, 20000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => ({
    pending: emergencies.filter((e) => e.status === 'pending').length,
    resolved: emergencies.filter((e) => e.status === 'resolved').length,
  }), [emergencies]);

  const handleResolve = async () => {
    if (!confirmModal) return;
    setSubmitting(true);
    try {
      const nota = notes.trim();
      await resolveEmergency(confirmModal.id);
      try {
        await sendEmergencyMessage(confirmModal.id, `Emergencia resuelta por Admin CargaExpress${nota ? ` - ${nota}` : ''}`);
      } catch { /* la constancia en el chat es opcional */ }
      await fetchEmergencies();
      setConfirmModal(null);
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resolver la emergencia');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirm = (row) => {
    setConfirmModal(row);
    setNotes('');
  };

  const userName = (row) => {
    const u = row.usuario;
    if (u) return `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.telefono || '—';
    return row.userName || row.user?.name || '—';
  };
  const ruta = (row) => (row.viaje && (row.viaje.origen || row.viaje.destino)) ? `${row.viaje.origen || '?'} → ${row.viaje.destino || '?'}` : null;
  const coords = (row) => (row.lat || row.lng) ? `${row.lat || '-'}, ${row.lng || '-'}` : null;

  const openDetail = async (row) => {
    setDetailModal(row);
    setTripDetail(null);
    setChatMensajes([]);
    setChatError(null);
    if (row.viajeId) {
      try {
        const r = await getTripById(row.viajeId);
        setTripDetail(r.data?.data || r.data);
      } catch { /* sin detalle del viaje */ }
    }
    try {
      setChatLoading(true);
      const r = await getEmergencyChat(row.id);
      const d = r.data;
      setChatMensajes(Array.isArray(d) ? d : (d.messages || d.data || []));
    } catch (err) {
      setChatError(err.response?.data?.message || 'No se pudo cargar el chat');
    } finally { setChatLoading(false); }
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
      key: 'usuario',
      label: 'Usuario',
      render: (_, row) => (
        <span style={{ fontWeight: 600 }}>{userName(row)}</span>
      ),
    },
    {
      key: 'viaje',
      label: 'Ruta',
      render: (_, row) => (
        <span>{ruta(row) || '—'}</span>
      ),
    },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      render: (_, row) => (
        <span>{coords(row) || row.ubicacion || '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val, row) => <StatusBadge status={row.status || val} />,
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
              openDetail(row);
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
                openConfirm(row);
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

  return (
    <div style={styles.page}>
      <style>{pulseKeyframes}</style>

      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>Emergencias</h1>
          <p style={styles.subtitle}>Gestiona las alertas de emergencia activas</p>
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

      <div style={{ marginBottom: 34 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: theme.text, margin: 0 }}>🚨 Activas</h2>
          <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, backgroundColor: `${theme.danger}20`, color: theme.danger }}>{counts.pending} pendientes</span>
        </div>
        <DataTable
          columns={columns}
          data={emergencies.filter((e) => e.status === 'pending')}
          loading={loading}
          onRowClick={openDetail}
          emptyMessage="No hay emergencias activas"
        />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: theme.text, margin: 0 }}>✅ Resueltas</h2>
          <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, backgroundColor: `${theme.success}20`, color: theme.success }}>{counts.resolved} resueltas</span>
        </div>
        <DataTable
          columns={columns}
          data={emergencies.filter((e) => e.status === 'resolved')}
          loading={loading}
          onRowClick={openDetail}
          emptyMessage="Aún no hay emergencias resueltas"
        />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Detalles de Emergencia"
        size="lg"
      >
        {detailModal && (
          <div>
            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>ID Emergencia</p>
                <p style={styles.detailValue}>#{String(detailModal.id).slice(0, 8)}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Usuario</p>
                <p style={styles.detailValue}>{userName(detailModal)}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Tipo</p>
                <p style={styles.detailValue}>🚨 SOS</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Ruta del viaje</p>
                <p style={styles.detailValue}>{ruta(detailModal) || detailModal.viaje?.estado || '—'}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Ubicación</p>
                <p style={styles.detailValue}>{coords(detailModal) || detailModal.ubicacion || '—'}</p>
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Estado</p>
                <StatusBadge status={detailModal.status || (detailModal.atendida ? 'resolved' : 'pending')} />
              </div>
              <div style={styles.detailCard}>
                <p style={styles.detailLabel}>Fecha</p>
                <p style={styles.detailValue}>
                  {detailModal.createdAt
                    ? new Date(detailModal.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
              </div>
            </div>

            {detailModal.description && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.label}>Descripción</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.7, color: theme.muted }}>
                  {detailModal.description}
                </p>
              </div>
            )}

            {detailModal.notes && (
              <div style={{ marginTop: 16 }}>
                <p style={styles.label}>Notas de resolución</p>
                <p style={{ ...styles.detailValue, lineHeight: 1.7 }}>
                  {detailModal.notes}
                </p>
              </div>
            )}

            {tripDetail && (() => {
              const viaje = tripDetail;
              const activador = detailModal.usuario;
              const esConductorSolicitante = viaje.conductor?.telefono && activador?.telefono === viaje.conductor.telefono;
              const solicitante = esConductorSolicitante ? viaje.conductor : viaje.cliente;
              const contraparte = esConductorSolicitante ? viaje.cliente : viaje.conductor;
              return (
                <>
                  <div style={{ marginTop: 16, background: `${theme.accent}10`, border: `1px solid ${theme.accent}40`, borderRadius: 10, padding: 14 }}>
                    <p style={styles.detailLabel}>🛣️ Ruta de emergencia</p>
                    <p style={{ fontSize: 13, color: theme.text, margin: '0 0 8px', lineHeight: 1.6 }}>
                      <b style={{ color: theme.success }}>Salida:</b> {viaje.origen?.direccion || '—'}<br />
                      <b style={{ color: theme.danger }}>Destino:</b> {viaje.destino?.direccion || '—'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {viaje.origen?.lat != null && <button onClick={() => window.open(`https://www.google.com/maps?q=${viaje.origen.lat},${viaje.origen.lng}`, '_blank')} style={styles.detailBtn}>🔎 Salida en mapa</button>}
                      {viaje.destino?.lat != null && <button onClick={() => window.open(`https://www.google.com/maps?q=${viaje.destino.lat},${viaje.destino.lng}`, '_blank')} style={styles.detailBtn}>🔎 Destino en mapa</button>}
                      {detailModal.lat && detailModal.lng && <button onClick={() => window.open(`https://www.google.com/maps?q=${detailModal.lat},${detailModal.lng}`, '_blank')} style={{ ...styles.detailBtn, borderColor: theme.danger, color: theme.danger }}>SOS en mapa</button>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginTop: 10 }}>
                      <div><span style={{ color: theme.muted }}>Estado viaje:</span> <b>{viaje.estado || '—'}</b></div>
                      <div><span style={{ color: theme.muted }}>Carga:</span> {viaje.carga || 'SOS'}</div>
                      <div><span style={{ color: theme.muted }}>Precio:</span> ${Number(viaje.precioFinal ?? viaje.precioEstimado ?? 0).toLocaleString('es-CO')}</div>
                      <div><span style={{ color: theme.muted }}>Tiempo est.:</span> {viaje.tiempoEstimadoMinutos != null ? `${viaje.tiempoEstimadoMinutos} min` : '—'}</div>
                    </div>
                  </div>

                  {(solicitante || contraparte) && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: theme.bg, borderRadius: 10, border: `1px solid ${theme.border}`, padding: 12 }}>
                        <p style={styles.detailLabel}>★ Solicitante ({esConductorSolicitante ? 'conductor' : 'cliente'})</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: 0 }}>{solicitante?.nombre || '—'}</p>
                        <a href={`tel:${solicitante?.telefono || ''}`} style={{ fontSize: 12, color: theme.accent }}>{solicitante?.telefono || '—'}</a>
                        {solicitante?.placa && <p style={{ fontSize: 12, color: theme.muted, margin: '4px 0 0' }}>Placa: {solicitante.placa} • {solicitante.tipoVehiculo || ''}</p>}
                      </div>
                      <div style={{ background: theme.bg, borderRadius: 10, border: `1px solid ${theme.border}`, padding: 12 }}>
                        <p style={styles.detailLabel}>Contraparte ({esConductorSolicitante ? 'cliente' : 'conductor'})</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: 0 }}>{contraparte?.nombre || '—'}</p>
                        <a href={`tel:${contraparte?.telefono || ''}`} style={{ fontSize: 12, color: theme.accent }}>{contraparte?.telefono || '—'}</a>
                        {contraparte?.placa && <p style={{ fontSize: 12, color: theme.muted, margin: '4px 0 0' }}>Placa: {contraparte.placa} • {contraparte.tipoVehiculo || ''}</p>}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            <div style={{ marginTop: 16, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
              <p style={styles.detailLabel}>💬 Chat de emergencia — quien lo atendió</p>
              {chatLoading && <p style={{ fontSize: 11, color: theme.muted }}>Cargando chat...</p>}
              {chatError && <p style={{ fontSize: 11, color: theme.danger }}>{chatError}</p>}
              {!chatLoading && !chatError && chatMensajes.length === 0 && <p style={{ fontSize: 11, color: theme.muted, fontStyle: 'italic' }}>Sin mensajes en el chat.</p>}
              {(() => {
                const atendidoPor = [...new Set(
                  chatMensajes
                    .filter((m) => m.remitente && m.remitente.id !== detailModal.userId && m.remitente.nombre !== userName(detailModal))
                    .map((m) => m.remitente.nombre)
                )];
                return atendidoPor.length > 0 ? (
                  <p style={{ fontSize: 12, color: theme.warning, fontWeight: 700, margin: '0 0 8px' }}>
                    🛡️ Atendido por: {atendidoPor.join(', ')} <span style={{ fontWeight: 500, color: theme.success }}>{detailModal.atendida ? '✓ resuelta' : 'en gestión'}</span>
                  </p>
                ) : detailModal.atendida ? (
                  <p style={{ fontSize: 12, color: theme.success, fontWeight: 700, margin: '0 0 8px' }}>✓ Emergencia atendida</p>
                ) : null;
              })()}
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMensajes.map((m) => {
                  const isMod = m.remitente && m.remitente.id !== detailModal.userId;
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMod ? 'flex-end' : 'flex-start', gap: 2 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: theme.muted }}>
                        <span style={{ fontWeight: 600, color: isMod ? theme.accent : theme.text }}>{m.remitente?.nombre || (isMod ? 'Moderador' : 'Usuario')}</span>
                        {m.remitente?.esModerador && <span style={{ padding: '1px 4px', borderRadius: 4, background: theme.warning, color: '#fff', fontSize: 9 }}>MODERADOR</span>}
                        <span>{new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ maxWidth: '78%', padding: '6px 10px', borderRadius: isMod ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isMod ? theme.accent : '#21262d', color: '#fff', fontSize: 12, wordBreak: 'break-word' }}>{m.mensaje}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Resolve Dialog */}
      <ConfirmDialog
        isOpen={!!confirmModal}
        onClose={() => {
          setConfirmModal(null);
          setNotes('');
        }}
        onConfirm={handleResolve}
        title="Resolver Emergencia"
        message={`¿Deseas marcar la emergencia #${confirmModal ? String(confirmModal.id).slice(0, 8) : ''} como resuelta?`}
        confirmText={submitting ? 'Resolviendo...' : 'Resolver'}
        danger={false}
      >
        <textarea
          style={styles.textarea}
          placeholder="Notas opcionales sobre la resolución..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={(e) => { e.target.style.borderColor = theme.accent; }}
          onBlur={(e) => { e.target.style.borderColor = theme.border; }}
        />
      </ConfirmDialog>
    </div>
  );
}

export default EmergenciesPage;
