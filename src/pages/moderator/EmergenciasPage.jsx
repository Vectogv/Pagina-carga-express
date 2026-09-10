import { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { getModeratorEmergencies, acknowledgeEmergency, resolveEmergency, getModeratorTripDetail } from '../../api/moderator';
import { io } from 'socket.io-client';

const theme = { bg: '#0d1117', cards: '#161b22', border: '#21262d', text: '#f0f6fc', muted: '#8b949e', danger: '#f85149', warning: '#d29922', success: '#2ea043' };

export default function ModeratorEmergenciasPage() {
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'activas');
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tripDetail, setTripDetail] = useState(null);
  const [observacion, setObservacion] = useState('');
  const limit = 10;

  const fetchEmergencies = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let estado = undefined;
      if (tab === 'activas') estado = 'pendiente,atendida';
      else if (tab === 'historico') estado = 'resuelta';
      const params = { page, limit };
      if (estado) params.estado = estado;
      const res = await getModeratorEmergencies(params);
      const d = res.data;
      const list = Array.isArray(d) ? d : (d.emergencies || d.data || []);
      setEmergencies(list);
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(err.response?.data?.message || 'Error al cargar emergencias');
    } finally { setLoading(false); }
  }, [tab, page]);

  useEffect(() => { fetchEmergencies(); }, [fetchEmergencies]);
  useEffect(() => { setPage(1); const url = new URL(window.location.href); if (tab === 'activas') url.searchParams.delete('tab'); else url.searchParams.set('tab', tab); window.history.replaceState({}, '', url); }, [tab]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io('https://bakend-cargaexpress-production.up.railway.app', {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    socket.on('moderator:emergency:update', (payload) => {
      setEmergencies((prev) => {
        const idx = prev.findIndex((e) => String(e.id) === String(payload.id));
        if (idx >= 0) {
          // Si cambia de activa a resuelta y estamos en activas, elimínalo
          const isActivas = tab === 'activas';
          const isResuelta = payload.estado === 'resuelta';
          if (isActivas && isResuelta) return prev.filter((e) => String(e.id) !== String(payload.id));
          const n = [...prev]; n[idx] = { ...n[idx], ...payload }; return n;
        }
        const isActivas = tab === 'activas';
        if (payload.estado === 'pendiente' && isActivas) return [payload, ...prev];
        return prev;
      });
      if (selected && String(selected.id) === String(payload.id)) setSelected((prev) => ({ ...prev, ...payload }));
    });
    socket.on('emergency:alert', (payload) => {
      if (tab === 'activas') setEmergencies((prev) => prev.some((e) => String(e.id) === String(payload.id)) ? prev : [payload, ...prev]);
    });
    return () => { socket.disconnect(); };
  }, [tab, selected]);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const openDetail = async (row) => {
    setSelected(row);
    setTripDetail(null);
    try {
      const res = await getModeratorTripDetail(row.viajeId || row.tripId || row.viaje?.id);
      const d = res.data?.data || res.data;
      setTripDetail(d);
    } catch {}
  };

  const handleAcknowledge = async () => {
    if (!selected) return;
    setActionLoading(selected.id);
    try {
      const res = await acknowledgeEmergency(selected.id);
      const updated = res.data;
      setSelected((prev) => ({ ...prev, estado: updated.estado || 'atendida', estadoLabel: updated.estadoLabel, administrador: updated.atendidoPor, atendidaAt: updated.atendidaAt }));
      setEmergencies((prev) => prev.map((e) => String(e.id) === String(selected.id) ? { ...e, estado: updated.estado || 'atendida', estadoLabel: updated.estadoLabel, administrador: updated.atendidoPor, atendidaAt: updated.atendidaAt } : e));
      showToast('Caso abierto');
    } catch (err) {
      const s = err.response?.status;
      if (s === 409) showToast('Ya no está pendiente', false);
      else if (s === 403) showToast('No es de tu ciudad', false);
      else showToast(err.response?.data?.message || 'Error', false);
    } finally { setActionLoading(null); }
  };

  const handleResolve = async () => {
    if (!selected || !observacion.trim()) return showToast('Observación obligatoria', false);
    setActionLoading(selected.id);
    try {
      const res = await resolveEmergency(selected.id, { observacion: observacion.trim() });
      const updated = res.data;
      setSelected((prev) => ({ ...prev, estado: updated.estado || 'resuelta', estadoLabel: updated.estadoLabel, observacion: updated.observacion, resueltoPor: updated.resueltoPor, resueltaAt: updated.resueltaAt, atendidaAt: updated.atendidaAt || prev.atendidaAt, administrador: updated.atendidoPor || prev.administrador }));
      setEmergencies((prev) => prev.map((e) => String(e.id) === String(selected.id) ? { ...e, estado: updated.estado || 'resuelta', observacion: updated.observacion } : e));
      showToast('Caso resuelto');
      setObservacion('');
    } catch (err) {
      const s = err.response?.status;
      if (s === 409) showToast('Ya fue resuelta', false);
      else showToast(err.response?.data?.message || 'Error', false);
    } finally { setActionLoading(null); }
  };

  const formatFecha = (v) => v ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)) : '-';

  const columns = [
    { key: 'estado', label: 'Estado', render: (v) => {
      const s = v === 'pendiente' ? { bg: 'rgba(248,81,73,0.15)', color: '#f85149' } : v === 'atendida' ? { bg: 'rgba(210,153,34,0.15)', color: '#d29922' } : { bg: 'rgba(46,160,67,0.15)', color: '#2ea043' };
      return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, background: s.bg, color: s.color, fontWeight: 600, textTransform: 'capitalize' }}>{v || '-'}</span>;
    }},
    { key: 'motivo', label: 'Motivo', render: (v) => <span title={v || ''} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{v || '-'}</span> },
    { key: 'usuario', label: 'Quién activó', render: (_, r) => `${r.usuario?.nombre || ''} ${r.usuario?.telefono ? '• ' + r.usuario.telefono : ''}`.trim() || '-' },
    { key: 'viaje', label: 'Viaje', render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#58a6ff' }}>#{String(r.viajeId || '').slice(0, 6)}</span>
          <span style={{ fontSize: 10, color: theme.muted }}>{r.viaje?.estadoLabel || r.viaje?.estado || ''}</span>
        </div>
      )},
    { key: 'cliente', label: 'Cliente', render: (_, r) => r.viaje?.cliente ? `${r.viaje.cliente.nombre || ''}`.trim() : '-' },
    { key: 'atendido', label: 'Atendido/Resuelto por', render: (_, r) => r.administrador || r.resueltoPor || '-' },
    { key: 'fechas', label: 'Fechas', render: (_, r) => <div style={{ fontSize: 11, color: theme.muted }}>{formatFecha(r.createdAt)}</div> },
    { key: 'ubicacion', label: 'Ubicación', render: (_, r) => r.lat && r.lng ? <button onClick={() => window.open(`https://www.google.com/maps?q=${r.lat},${r.lng}`, '_blank')} style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #30363d', background: '#21262d', color: '#58a6ff', fontSize: 11, cursor: 'pointer' }}>🔎</button> : '-' },
    { key: 'acciones', label: 'Acciones', render: (_, r) => <button onClick={() => openDetail(r)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #30363d', background: '#21262d', color: '#8b949e', fontSize: 11, cursor: 'pointer' }}>Ver</button> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { key: 'activas', label: 'Activas' },
          { key: 'historico', label: 'Resueltas' },
          { key: 'todas', label: 'Todas' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${tab === t.key ? '#f85149' : theme.border}`, background: tab === t.key ? 'rgba(248,81,73,0.12)' : 'transparent', color: tab === t.key ? '#f85149' : theme.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>
      {error && <div style={{ padding: 10, background: 'rgba(248,81,73,0.1)', color: theme.danger, borderRadius: 8, fontSize: 12 }}>{error}</div>}
      <DataTable columns={columns} data={emergencies} loading={loading} emptyMessage={tab === 'activas' ? 'No hay emergencias activas' : tab === 'historico' ? 'No hay emergencias resueltas' : 'No hay emergencias'} onRowClick={openDetail} />

      <Modal isOpen={!!selected} onClose={() => { setSelected(null); setTripDetail(null); setObservacion(''); }} title={`Caso #${String(selected?.id || '').slice(0, 8)} — ${selected?.estadoLabel || selected?.estado || ''}`} size="lg">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, background: selected.estado === 'pendiente' ? 'rgba(248,81,73,0.15)' : selected.estado === 'atendida' ? 'rgba(210,153,34,0.15)' : 'rgba(46,160,67,0.15)', color: selected.estado === 'pendiente' ? '#f85149' : selected.estado === 'atendida' ? '#d29922' : '#2ea043', fontWeight: 700 }}>{selected.estadoLabel || selected.estado}</span>
              <span style={{ fontSize: 11, color: theme.muted }}>{formatFecha(selected.createdAt)}</span>
            </div>

            <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 6px' }}>El problema</p>
              <p style={{ fontSize: 13, color: theme.text, margin: 0 }}>{selected.motivo || '-'}</p>
              <p style={{ fontSize: 11, color: theme.muted, margin: '6px 0 0' }}>Lat {selected.lat}, Lng {selected.lng} <button onClick={() => window.open(`https://www.google.com/maps?q=${selected.lat},${selected.lng}`, '_blank')} style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 6, border: '1px solid #30363d', background: '#21262d', color: '#58a6ff', fontSize: 10, cursor: 'pointer' }}>Ver mapa</button></p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 6px' }}>Quién activó</p>
                <p style={{ fontSize: 13, color: theme.text, margin: 0 }}>{selected.usuario?.nombre || '-'}</p>
                <a href={`tel:${selected.usuario?.telefono || ''}`} style={{ fontSize: 12, color: '#58a6ff' }}>{selected.usuario?.telefono || ''}</a>
              </div>
              <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 6px' }}>Viaje #{String(selected.viajeId || '').slice(0, 8)}</p>
                <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{selected.viaje?.origenDireccion || ''} → {selected.viaje?.destinoDireccion || ''}</p>
                <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>Cliente: {selected.viaje?.cliente?.nombre || '-'} {selected.viaje?.cliente?.telefono || ''}</p>
              </div>
            </div>

            {tripDetail && (
              <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>Detalle del viaje</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                  <div><span style={{ color: theme.muted }}>Conductor:</span> {tripDetail.conductor?.nombre || '-'} {tripDetail.conductor?.placa ? `(${tripDetail.conductor.placa})` : ''} {tripDetail.conductor?.calificacion ? `⭐${tripDetail.conductor.calificacion}` : ''}</div>
                  <div><span style={{ color: theme.muted }}>Precio:</span> ${Number(tripDetail.dinero?.precioFinal || tripDetail.dinero?.precioCliente || 0).toLocaleString('es-CO')}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selected.estado === 'pendiente' && (
                <button disabled={actionLoading === selected.id} onClick={handleAcknowledge} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#58a6ff', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: actionLoading === selected.id ? 0.6 : 1 }}>{actionLoading === selected.id ? 'Abriendo...' : 'Abrir caso'}</button>
              )}
              {selected.estado === 'atendida' && (
                <>
                  <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>Atendido por {selected.administrador || selected.atendidoPor || ''} {selected.atendidaAt ? formatFecha(selected.atendidaAt) : ''}</p>
                  <label style={{ fontSize: 11, fontWeight: 600, color: theme.muted }}>Observación / gestión realizada *</label>
                  <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Describe la gestión realizada..." rows={3} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }} />
                  <button disabled={actionLoading === selected.id || !observacion.trim()} onClick={handleResolve} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: !observacion.trim() ? '#30363d' : '#2ea043', color: '#fff', fontWeight: 700, cursor: !observacion.trim() ? 'not-allowed' : 'pointer', opacity: actionLoading === selected.id ? 0.6 : 1 }}>{actionLoading === selected.id ? 'Resolviendo...' : 'Marcar resuelta'}</button>
                </>
              )}
              {selected.estado === 'resuelta' && (
                <div style={{ background: 'rgba(46,160,67,0.08)', border: '1px solid rgba(46,160,67,0.3)', borderRadius: 8, padding: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#2ea043', margin: 0 }}>✓ Resuelta</p>
                  <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>{selected.observacion || 'Sin observación'}</p>
                  <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>Atendido por {selected.administrador || selected.atendidoPor || '-'} {selected.atendidaAt ? formatFecha(selected.atendidaAt) : ''}</p>
                  <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>Resuelto por {selected.resueltoPor || '-'} {selected.resueltaAt ? formatFecha(selected.resueltaAt) : ''}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {toast && <div style={{ position: 'fixed', bottom: 16, right: 16, background: toast.ok ? theme.success : theme.danger, color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>{toast.msg}</div>}
    </div>
  );
}
