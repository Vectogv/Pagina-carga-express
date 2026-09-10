import { useState, useEffect, useCallback, useRef } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ServiceStatusTimeline from '../../components/moderator/ServiceStatusTimeline';
import { getModeratorTrips, getModeratorTripDetail, getModeratorEmergencies, acknowledgeEmergency, resolveEmergency } from '../../api/moderator';
import { io } from 'socket.io-client';
import api from '../../api/axios';

const theme = { bg: '#0d1117', cards: '#161b22', border: '#21262d', text: '#f0f6fc', muted: '#8b949e', accent: '#f59e0b', success: '#2ea043', warning: '#d29922', danger: '#f85149' };

const estadoColors = {
  pendiente: { bg: 'rgba(139,148,158,0.15)', color: '#8b949e' },
  aceptado: { bg: 'rgba(31,111,235,0.15)', color: '#58a6ff' },
  en_curso: { bg: 'rgba(210,153,34,0.15)', color: '#d29922' },
  finalizado: { bg: 'rgba(46,160,67,0.15)', color: '#2ea043' },
  completado: { bg: 'rgba(46,160,67,0.15)', color: '#2ea043' },
  cancelado: { bg: 'rgba(248,81,73,0.15)', color: '#f85149' },
  sos: { bg: 'rgba(248,81,73,0.25)', color: '#f85149', border: '1px solid #f85149' },
};

const formatDinero = (v) => '$' + Number(v || 0).toLocaleString('es-CO');
const formatFecha = (v) => v ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)) : '-';

export default function ModeratorTripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [emergencyBanner, setEmergencyBanner] = useState(null);
  const [socketStatus, setSocketStatus] = useState('desconectado');
  const [mapboxToken, setMapboxToken] = useState(null);
  const audioRef = useRef(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page: 1, limit: 50 };
      if (estado) params.estado = estado;
      const res = await getModeratorTrips(params);
      const d = res.data;
      setTrips(Array.isArray(d) ? d : (d.trips || d.data || []));
    } catch (err) { setError(err.response?.data?.message || 'Error al cargar viajes'); }
    finally { setLoading(false); }
  }, [estado]);

  const fetchEmergencies = useCallback(async () => {
    try {
      const res = await getModeratorEmergencies({ page: 1, limit: 20 });
      const d = res.data;
      setEmergencies(Array.isArray(d) ? d : (d.emergencies || d.data || []));
    } catch {}
  }, []);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true); setDetailError(null);
    try {
      const res = await getModeratorTripDetail(id);
      const d = res.data?.data || res.data;
      setDetail(d);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Error al cargar detalle';
      setDetailError(err.response?.status === 404 ? 'Viaje no encontrado en tu ciudad' : msg);
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { fetchEmergencies(); }, [fetchEmergencies]);
  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    else { setDetail(null); setDetailError(null); }
  }, [selectedId, fetchDetail]);

  useEffect(() => {
    api.get('/api/config/mapbox').then((r) => setMapboxToken(r.data?.token || r.data?.accessToken || null)).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io('https://bakend-cargaexpress-production.up.railway.app', {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    socket.on('connect', () => setSocketStatus('conectado'));
    socket.on('disconnect', () => setSocketStatus('desconectado'));
    socket.on('connect_error', () => setSocketStatus('error'));
    socket.on('moderator:trip:update', (payload) => {
      setTrips((prev) => {
        const idx = prev.findIndex((t) => String(t.id) === String(payload.id));
        if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...payload }; return n; }
        return [payload, ...prev];
      });
      if (String(selectedId) === String(payload.id)) fetchDetail(payload.id);
    });
    socket.on('moderator:emergency:update', (payload) => {
      setEmergencies((prev) => {
        const idx = prev.findIndex((e) => String(e.id) === String(payload.id));
        if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...payload }; return n; }
        return [payload, ...prev];
      });
      if (payload.estado === 'pendiente') {
        setEmergencyBanner(payload);
        try {
          if (!audioRef.current) audioRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
          audioRef.current.play().catch(()=>{});
        } catch {}
      }
      if (selectedId && String(payload.viajeId || payload.tripId) === String(selectedId)) fetchDetail(selectedId);
    });
    socket.on('emergency:alert', (payload) => {
      setEmergencyBanner(payload);
      setEmergencies((prev) => [payload, ...prev]);
    });
    if (Notification && Notification.permission === 'default') Notification.requestPermission();
    return () => { socket.disconnect(); };
  }, [selectedId, fetchDetail]);

  const columns = [
    { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#58a6ff' }}>#{String(v).slice(0, 8)}</span> },
    { key: 'estado', label: 'Estado', render: (v, r) => { const s = estadoColors[v] || { bg: 'rgba(139,148,158,0.15)', color: '#8b949e' }; const label = r.estadoLabel || v || '-'; return <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, background: s.bg, color: s.color, border: s.border ? `1px solid ${s.border}` : 'none' }}>{label}</span>; } },
    { key: 'origen', label: 'Origen', render: (_, r) => r.origenDireccion || r.origen?.direccion || (typeof r.origen === 'string' ? r.origen : '-') },
    { key: 'destino', label: 'Destino', render: (_, r) => r.destinoDireccion || r.destino?.direccion || (typeof r.destino === 'string' ? r.destino : '-') },
    { key: 'cliente', label: 'Cliente', render: (_, r) => r.cliente ? `${r.cliente.nombre || ''} ${r.cliente.telefono || ''}`.trim() || r.cliente.email || '-' : '-' },
    { key: 'conductor', label: 'Conductor', render: (_, r) => r.conductor ? `${r.conductor.placa || ''} ${r.conductor.nombre || ''}`.trim() || r.conductor.telefono || '-' : '-' },
    { key: 'precio', label: 'Precio', render: (_, r) => r.precioCliente ? `$${Number(r.precioCliente).toLocaleString('es-CO')}` : r.precioFinal ? `$${Number(r.precioFinal).toLocaleString('es-CO')}` : '-' },
    { key: 'createdAt', label: 'Creado', render: (v) => v ? new Date(v).toLocaleString('es-CO') : '-' },
    { key: 'seguimiento', label: '', render: (_, r) => <button onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #58a6ff', background: 'rgba(88,166,255,0.12)', color: '#58a6ff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Ver seguimiento</button> },
  ];

  const detailEmergency = detail?.alertas?.[0] || emergencies.find((e) => String(e.viajeId || e.tripId) === String(detail?.id));

  const handleAcknowledge = async () => {
    if (!detailEmergency) return;
    try { await acknowledgeEmergency(detailEmergency.id); fetchDetail(selectedId); fetchEmergencies(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };
  const handleResolve = async () => {
    if (!detailEmergency) return;
    try { await resolveEmergency(detailEmergency.id); fetchDetail(selectedId); fetchEmergencies(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: theme.muted }}>Vista:</span>
          {[
            { key: 'activos', label: `En curso` },
            { key: 'todos', label: 'Todos' },
          ].map((v) => (
            <button key={v.key} onClick={() => {}} style={{ padding: '6px 10px', borderRadius: 20, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.muted, fontSize: 11, cursor: 'default' }}>{v.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: socketStatus==='conectado' ? theme.success : theme.danger }}>● {socketStatus}</span>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cards, color: theme.text, fontSize: 11 }}>
            <option value="">Todos (con conductor)</option>
            <option value="pendiente">Pendiente</option>
            <option value="aceptado">Aceptado</option>
            <option value="en_curso">En curso</option>
            <option value="finalizado">Finalizado</option>
            <option value="sos">SOS</option>
          </select>
        </div>
      </div>

      {emergencyBanner && (
        <div style={{ background: 'rgba(248,81,73,0.15)', border: '1px solid #f85149', borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#f85149', margin: 0 }}>Emergencia — {emergencyBanner.usuario?.nombre || ''} • {emergencyBanner.motivo || 'Emergencia'}</p>
            <p style={{ fontSize: 11, color: theme.muted, margin: '2px 0 0' }}>Viaje #{emergencyBanner.viajeId || '—'} • {emergencyBanner.createdAt ? new Date(emergencyBanner.createdAt).toLocaleString('es-CO') : ''}</p>
          </div>
          <button onClick={() => setEmergencyBanner(null)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#f85149', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Atendido</button>
        </div>
      )}

      {error && <div style={{ padding: 10, background: 'rgba(248,81,73,0.1)', color: theme.danger, borderRadius: 8, fontSize: 12 }}>{error}</div>}
      <DataTable columns={columns} data={trips} loading={loading} emptyMessage="No hay viajes en tu ciudad con los filtros actuales" onRowClick={(r) => setSelectedId(r.id)} />

      <Modal isOpen={!!selectedId} onClose={() => { setSelectedId(null); setDetail(null); }} title={detail ? `Viaje #${String(detail.id).slice(0, 8)} — ${detail.estadoLabel || detail.estado}` : 'Cargando...'} size="lg">
        {detailLoading && <div style={{ padding: 24, textAlign: 'center', color: theme.muted }}>Cargando detalle...</div>}
        {detailError && <div style={{ padding: 12, background: 'rgba(248,81,73,0.1)', color: theme.danger, borderRadius: 8 }}>{detailError}</div>}
        {detail && !detailLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header badge */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, background: (estadoColors[detail.estado] || {}).bg || 'rgba(139,148,158,0.15)', color: (estadoColors[detail.estado] || {}).color || '#8b949e', fontWeight: 700 }}>{detail.estadoLabel || detail.estado}</span>
              <span style={{ fontSize: 11, color: theme.muted }}>#{detail.id}</span>
            </div>

            {/* Timeline */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Seguimiento</p>
              <ServiceStatusTimeline estado={detail.estado} />
            </div>

            {/* Mapa */}
            <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>Ruta</p>
              {mapboxToken && detail.origen?.lat && detail.destino?.lat ? (
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-a+22c55e(${detail.origen.lng},${detail.origen.lat}),pin-s-b+f85149(${detail.destino.lng},${detail.destino.lat})/${detail.origen.lng},${detail.origen.lat},11,0/500x200?access_token=${mapboxToken}`}
                  alt="Mapa"
                  style={{ width: '100%', height: 200, borderRadius: 8, objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
                />
              ) : null}
              <div style={{ display: mapboxToken && detail.origen?.lat ? 'none' : 'block', padding: 12, background: theme.bg, borderRadius: 8, fontSize: 12, color: theme.muted }}>
                Origen: {detail.origen?.direccion || '-'} ({detail.origen?.lat || '-'}, {detail.origen?.lng || '-'})<br />
                Destino: {detail.destino?.direccion || '-'} ({detail.destino?.lat || '-'}, {detail.destino?.lng || '-'})
              </div>
            </div>

            {/* Cliente y Conductor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>Cliente</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <img src={detail.cliente?.avatar ? `https://bakend-cargaexpress-production.up.railway.app/storage/uploads/${detail.cliente.avatar}` : `https://i.pravatar.cc/40?u=${detail.cliente?.email || detail.id}`} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, margin: 0 }}>{detail.cliente?.nombre || '-'}</p>
                    <a href={`tel:${detail.cliente?.telefono || ''}`} style={{ fontSize: 11, color: '#58a6ff' }}>{detail.cliente?.telefono || ''}</a>
                    <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{detail.cliente?.email || ''}</p>
                  </div>
                </div>
              </div>
              <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>Conductor</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#21262d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🚗</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: theme.text, margin: 0 }}>{detail.conductor?.nombre || '-'} <b style={{ color: theme.accent }}>{detail.conductor?.placa || ''}</b></p>
                    <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{detail.conductor?.tipoVehiculo || ''} • {detail.conductor?.ciudad || ''} • ⭐ {detail.conductor?.calificacion || '0.0'} • {detail.conductor?.totalViajes || 0} viajes {detail.conductor?.online ? '🟢' : '⚫'}</p>
                    <a href={`tel:${detail.conductor?.telefono || ''}`} style={{ fontSize: 11, color: '#58a6ff' }}>{detail.conductor?.telefono || ''}</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Dinero */}
            <div style={{ background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)', border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 10px' }}>💰 Dinero</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 12 }}>
                <div><span style={{ color: theme.muted }}>Precio al cliente:</span> <b style={{ color: theme.text }}>{formatDinero(detail.dinero?.precioCliente)}</b></div>
                <div><span style={{ color: theme.muted }}>Estimado:</span> {formatDinero(detail.dinero?.precioEstimado)}</div>
                <div><span style={{ color: theme.muted }}>Oferta aceptada:</span> {formatDinero(detail.dinero?.ofertaAceptada)}</div>
                <div><span style={{ color: theme.muted }}>Precio final:</span> <b style={{ color: theme.success, fontSize: 14 }}>{formatDinero(detail.dinero?.precioFinal)}</b></div>
                {detail.ganancias?.[0] && (
                  <>
                    <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${theme.border}`, paddingTop: 8, marginTop: 4 }}>
                      <span style={{ color: theme.muted }}>Ganancia conductor:</span> {formatDinero(detail.ganancias[0].montoBruto)} bruto • {formatDinero(detail.ganancias[0].montoNeto)} neto • Comisión 10%: {formatDinero(detail.ganancias[0].comision)} {detail.ganancias[0].comisionPagada ? <span style={{ padding: '2px 6px', borderRadius: 10, background: 'rgba(46,160,67,0.15)', color: '#2ea043', fontSize: 10, marginLeft: 6 }}>Pagada</span> : <span style={{ padding: '2px 6px', borderRadius: 10, background: 'rgba(210,153,34,0.15)', color: '#d29922', fontSize: 10, marginLeft: 6 }}>Pendiente</span>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Ofertas */}
            {detail.ofertas?.length > 0 && (
              <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>Ofertas ({detail.ofertas.length})</p>
                {detail.ofertas.map((o) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${theme.border}`, fontSize: 12 }}>
                    <span style={{ color: theme.text }}>{o.conductor?.nombre || o.conductor?.placa || 'Conductor'} • {formatDinero(o.monto)}</span>
                    <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 10, background: o.estado === 'aceptada' ? 'rgba(46,160,67,0.15)' : 'rgba(139,148,158,0.15)', color: o.estado === 'aceptada' ? '#2ea043' : theme.muted }}>{o.estado}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Emergencias */}
            {detail.alertas?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.danger, textTransform: 'uppercase', margin: 0 }}>🚨 Emergencias</p>
                {detail.alertas.map((a) => (
                  <div key={a.id} style={{ background: a.estado === 'pendiente' ? 'rgba(248,81,73,0.08)' : a.estado === 'atendida' ? 'rgba(210,153,34,0.08)' : 'rgba(46,160,67,0.08)', border: `1px solid ${a.estado === 'pendiente' ? '#f85149' : a.estado === 'atendida' ? '#d29922' : '#2ea043'}40`, borderRadius: 8, padding: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: theme.text, margin: 0 }}>{a.motivo || 'Emergencia'}</p>
                    <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>Estado: <b style={{ color: a.estado === 'pendiente' ? '#f85149' : a.estado === 'atendida' ? '#d29922' : '#2ea043' }}>{a.estadoLabel || a.estado}</b> {a.atendidoPor ? `• Atendido por ${a.atendidoPor} ${a.atendidaAt ? formatFecha(a.atendidaAt) : ''}` : ''} {a.resueltoPor ? `• Resuelto por ${a.resueltoPor} ${a.resueltaAt ? formatFecha(a.resueltaAt) : ''}` : ''}</p>
                    <p style={{ fontSize: 11, color: theme.muted, margin: '2px 0 0' }}>Usuario: {a.usuario?.nombre || ''} {a.usuario?.telefono || ''} • lat {a.lat}, lng {a.lng} • {formatFecha(a.createdAt)}</p>
                    {a.estado === 'pendiente' && <button onClick={async () => { await acknowledgeEmergency(a.id); const r = await getModeratorTripDetail(detail.id); setDetail(r.data?.data || r.data); }} style={{ marginTop: 6, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#f85149', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Atender emergencia</button>}
                    {a.estado === 'atendida' && <button onClick={async () => { await resolveEmergency(a.id); const r = await getModeratorTripDetail(detail.id); setDetail(r.data?.data || r.data); }} style={{ marginTop: 6, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#2ea043', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Marcar como resuelta</button>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: theme.muted, fontStyle: 'italic', margin: 0 }}>Sin emergencias para este viaje</p>
            )}
            {detail.motivoCancelacion && <p style={{ fontSize: 12, color: theme.danger }}><b>Motivo cancelación:</b> {detail.motivoCancelacion}</p>}
            {detail.fotoEntrega && <img src={`https://bakend-cargaexpress-production.up.railway.app/storage/uploads/${detail.fotoEntrega}`} alt="Entrega" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
