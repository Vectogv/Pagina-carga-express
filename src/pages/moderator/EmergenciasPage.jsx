import { useState, useEffect, useCallback, useRef } from 'react';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import { getModeratorEmergencies, acknowledgeEmergency, resolveEmergency, getModeratorTripDetail, getEmergencyMessages, sendEmergencyMessage } from '../../api/moderator';
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
  const [mensajes, setMensajes] = useState([]);
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensajesLoading, setMensajesLoading] = useState(false);
  const [mensajesError, setMensajesError] = useState(null);
  const chatEndRef = useRef(null);
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
          const isActivas = tab === 'activas';
          const isResuelta = payload.estado === 'resuelta';
          if (isActivas && isResuelta) return prev.filter((e) => String(e.id) !== String(payload.id));
          const n = [...prev]; n[idx] = { ...n[idx], ...payload }; return n;
        }
        if (payload.estado === 'pendiente' && tab === 'activas') return [payload, ...prev];
        return prev;
      });
      if (selected && String(selected.id) === String(payload.id)) setSelected((prev) => ({ ...prev, ...payload }));
    });
    socket.on('emergency:alert', (payload) => {
      if (tab === 'activas') setEmergencies((prev) => prev.some((e) => String(e.id) === String(payload.id)) ? prev : [payload, ...prev]);
    });
    socket.on('emergency:message', (data) => {
      if (!selected || String(data.alertaId) !== String(selected.id)) return;
      setMensajes((prev) => (prev.some((m) => String(m.id) === String(data.id)) ? prev : [...prev, data]));
    });
    return () => { socket.disconnect(); };
  }, [tab, selected]);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const openDetail = async (row) => {
    setSelected(row);
    setTripDetail(null);
    setMensajes([]); setMensajesError(null);
    try {
      const res = await getModeratorTripDetail(row.viajeId || row.tripId || row.viaje?.id);
      const d = res.data?.data || res.data;
      setTripDetail(d);
    } catch {}
    // Carga historial de chat
    try {
      setMensajesLoading(true);
      const r = await getEmergencyMessages(row.id);
      const d = r.data;
      setMensajes(Array.isArray(d) ? d : (d.messages || d.data || []));
    } catch (err) {
      if (err.response?.status === 403) setMensajesError('No participas en este caso');
      else if (err.response?.status === 404) setMensajesError('Alerta no encontrada');
      else setMensajesError(err.response?.data?.message || 'Error al cargar mensajes');
    } finally { setMensajesLoading(false); }
  };

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const enviarMensaje = async () => {
    if (!nuevoTexto.trim() || enviando || !selected) return;
    if (selected.estado === 'resuelta') return;
    setEnviando(true);
    try {
      const res = await sendEmergencyMessage(selected.id, { mensaje: nuevoTexto.trim() });
      const msg = res.data;
      setMensajes((prev) => (prev.some((m) => String(m.id) === String(msg.id)) ? prev : [...prev, msg]));
      setNuevoTexto('');
    } catch (err) {
      const s = err.response?.status;
      if (s === 403) showToast('No participas en este caso', false);
      else if (s === 422) showToast(err.response?.data?.message || 'Mensaje vacío', false);
      else showToast(err.response?.data?.message || 'Error al enviar', false);
    } finally { setEnviando(false); }
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

            {(() => {
              const alerta = selected;
              const viaje = tripDetail;
              if (!viaje) return null;
              const esConductorSolicitante = (viaje.conductor?.telefono && alerta.usuario?.telefono && viaje.conductor.telefono === alerta.usuario.telefono) || viaje.conductor?.nombre === alerta.usuario?.nombre;
              const solicitante = esConductorSolicitante ? viaje.conductor : viaje.cliente;
              const contraparte = esConductorSolicitante ? viaje.cliente : viaje.conductor;
              const solicitanteRol = esConductorSolicitante ? 'Conductor' : 'Cliente';
              const contraparteRol = esConductorSolicitante ? 'Cliente' : 'Conductor';
              return (
                <>
                  <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 10, padding: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#f85149', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>★ Solicitante — quien activó el SOS</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(248,81,73,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: '2px solid #f85149' }}>🚨</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: 0 }}>{solicitante?.nombre || alerta.usuario?.nombre || '-'} <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#f85149', color: '#fff', marginLeft: 6 }}>{solicitanteRol}</span></p>
                        <a href={`tel:${solicitante?.telefono || alerta.usuario?.telefono || ''}`} style={{ fontSize: 12, color: '#58a6ff' }}>{solicitante?.telefono || alerta.usuario?.telefono || ''}</a>
                        {solicitante?.email && <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{solicitante.email}</p>}
                        {solicitante?.placa && <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>Placa: {solicitante.placa} • {solicitante.tipoVehiculo || ''} • ⭐{solicitante.calificacion || '0.0'}</p>}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 6px' }}>Contraparte — {contraparteRol}</p>
                    <p style={{ fontSize: 13, color: theme.text, margin: 0 }}>{contraparte?.nombre || '-'}</p>
                    <a href={`tel:${contraparte?.telefono || ''}`} style={{ fontSize: 12, color: '#58a6ff' }}>{contraparte?.telefono || ''}</a>
                    {contraparte?.placa && <p style={{ fontSize: 11, color: theme.muted, margin: '2px 0 0' }}>Placa: {contraparte.placa} • {contraparte.tipoVehiculo || ''}</p>}
                  </div>
                </>
              );
            })()}

            {tripDetail && (
              <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>Conductor</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                  <div><span style={{ color: theme.muted }}>Nombre:</span> {tripDetail.conductor?.nombre || '-'}</div>
                  <div><span style={{ color: theme.muted }}>Placa:</span> {tripDetail.conductor?.placa || '-'}</div>
                  <div><span style={{ color: theme.muted }}>Cédula:</span> {tripDetail.conductor?.cedula || tripDetail.conductor?.cedulaConductor || '-'}</div>
                  <div><span style={{ color: theme.muted }}>Teléfono:</span> <a href={`tel:${tripDetail.conductor?.telefono || ''}`} style={{ color: '#58a6ff' }}>{tripDetail.conductor?.telefono || '-'}</a></div>
                  <div><span style={{ color: theme.muted }}>Tipo:</span> {tripDetail.conductor?.tipoVehiculo || '-'}</div>
                  <div><span style={{ color: theme.muted }}>Ciudad:</span> {tripDetail.conductor?.ciudad || '-'}</div>
                  <div><span style={{ color: theme.muted }}>Calificación:</span> ⭐{tripDetail.conductor?.calificacion || '0.0'}</div>
                  <div><span style={{ color: theme.muted }}>Precio:</span> ${Number(tripDetail.dinero?.precioFinal || tripDetail.dinero?.precioCliente || 0).toLocaleString('es-CO')}</div>
                </div>
              </div>
            )}

            {/* Chat de emergencia — privado con solicitante */}
            {(() => {
              const alerta = selected;
              const viaje = tripDetail;
              const esConductorSolicitante = viaje && ((viaje.conductor?.telefono && alerta.usuario?.telefono && viaje.conductor.telefono === alerta.usuario.telefono) || viaje.conductor?.nombre === alerta.usuario?.nombre);
              const solicitante = viaje ? (esConductorSolicitante ? viaje.conductor : viaje.cliente) : null;
              const chatTitle = solicitante ? `Chat con ${solicitante.nombre || alerta.usuario?.nombre || 'solicitante'}` : 'Chat de emergencia';
              return (
                <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>{chatTitle} {selected.estado === 'resuelta' ? '(solo lectura)' : ''}</p>
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                {mensajesLoading && <p style={{ fontSize: 11, color: theme.muted, textAlign: 'center' }}>Cargando mensajes...</p>}
                {mensajesError && <div style={{ padding: 8, background: 'rgba(248,81,73,0.1)', color: theme.danger, borderRadius: 6, fontSize: 11 }}>{mensajesError} <button onClick={() => { setMensajes([]); setMensajesError(null); openDetail(selected); }} style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 4, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.muted, fontSize: 10, cursor: 'pointer' }}>Reintentar</button></div>}
                {!mensajesLoading && !mensajesError && mensajes.length === 0 && <p style={{ fontSize: 11, color: theme.muted, textAlign: 'center', fontStyle: 'italic' }}>Sin mensajes aún. Saluda al conductor o cliente…</p>}
                {mensajes.map((m) => {
                  const isMod = !!m.remitente?.esModerador;
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMod ? 'flex-end' : 'flex-start', gap: 2 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: theme.muted }}>
                        <span style={{ fontWeight: 600, color: isMod ? '#58a6ff' : theme.text }}>{m.remitente?.nombre || (isMod ? 'Tú' : 'Usuario')}</span>
                        {m.remitente?.rol && <span style={{ padding: '1px 4px', borderRadius: 4, background: `${theme.border}`, fontSize: 9 }}>{m.remitente.rol}</span>}
                        <span>{new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ maxWidth: '75%', padding: '6px 10px', borderRadius: isMod ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isMod ? '#1f6feb' : '#21262d', color: '#fff', fontSize: 12, wordBreak: 'break-word' }}>
                        {m.mensaje}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              {selected.estado !== 'resuelta' ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    value={nuevoTexto}
                    onChange={(e) => setNuevoTexto(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
                    placeholder="Escribe un mensaje..."
                    disabled={enviando}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, fontSize: 12 }}
                  />
                  <button onClick={enviarMensaje} disabled={!nuevoTexto.trim() || enviando} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: !nuevoTexto.trim() || enviando ? '#30363d' : '#58a6ff', color: '#fff', fontSize: 12, fontWeight: 600, cursor: !nuevoTexto.trim() || enviando ? 'not-allowed' : 'pointer' }}>
                    {enviando ? '...' : '➤ Enviar'}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 11, color: theme.muted, textAlign: 'center', margin: '8px 0 0', fontStyle: 'italic' }}>Caso resuelto — chat en solo lectura</p>
              )}
            </div>
              );
            })()}

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
