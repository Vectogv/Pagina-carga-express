import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModeratorDrivers, getInactiveDrivers, getModeratorComunicados, getAvisos } from '../../api/moderator';
import api from '../../api/axios';

const theme = { bg: '#0d1117', cards: '#161b22', border: '#21262d', text: '#f0f6fc', muted: '#8b949e', accent: '#f59e0b', success: '#2ea043', danger: '#f85149' };

function CircularProgress({ value, max, color, size = 44 }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = c * pct;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="#21262d" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
    </svg>
  );
}

function MiniTrend({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 4, height: `${(v / max) * 20 + 4}px`, background: color, borderRadius: 2, opacity: 0.7 + (i / data.length) * 0.3 }} />
      ))}
    </div>
  );
}

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  });
  const [stats, setStats] = useState({ drivers: 0, inactive: 0, comunicadosPend: 0, avisos: 0 });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 5;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/users/profile');
        if (!cancelled) {
          const u = data.user || data.data || data;
          setUser(u);
          // Intenta enriquecer con zona si no viene
          if (!u.zonaModerador && !u.zona_moderador) {
            try {
              const dRes = await getModeratorDrivers({ page: 1, limit: 1 });
              const d = dRes.data;
              const list = Array.isArray(d) ? d : (d.drivers || d.data || []);
              if (list[0]?.ciudad) setUser((prev) => ({ ...prev, zonaModerador: list[0].ciudad }));
            } catch {}
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dRes, iRes, cRes, aRes] = await Promise.all([
          getModeratorDrivers({ page: 1, limit: 100 }),
          getInactiveDrivers({ page: 1, limit: 100 }),
          getModeratorComunicados({ page: 1, limit: 100 }),
          getAvisos({ page: 1, limit: 100 }),
        ]);
        if (cancelled) return;
        const dList = Array.isArray(dRes.data) ? dRes.data : (dRes.data.drivers || dRes.data.data || []);
        const iList = Array.isArray(iRes.data) ? iRes.data : (iRes.data.drivers || iRes.data.data || []);
        const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data.data || []);
        const aList = Array.isArray(aRes.data) ? aRes.data : (aRes.data.data || []);
        setDrivers(dList);
        setStats({
          drivers: dList.length,
          inactive: iList.length,
          comunicadosPend: cList.filter((c) => (c.estado || 'pendiente') === 'pendiente').length,
          avisos: aList.length,
        });
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const ciudad = user.zonaModerador || user.zona_moderador || '—';
  const online = drivers.filter((d) => d.online).length;
  const offline = drivers.length - online;
  const pendingVerif = drivers.filter((d) => (d.estadoVerificacion || d.estado_verificacion) === 'pendiente').length;
  const maxDrivers = Math.max(drivers.length, 10);
  const trendData = [2, 4, 3, 6, 5, 8, 6, 4];

  const paginated = drivers.slice((page - 1) * limit, page * limit);
  const totalPages = Math.max(1, Math.ceil(drivers.length / limit));

  if (loading) return <div style={{ padding: 40, color: theme.muted, textAlign: 'center' }}>Cargando dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* MODERATOR BANNER */}
      <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {user.avatar ? (
          <img src={user.avatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #30363d' }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #334155, #1e293b)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #30363d' }}>
            {(user.nombre?.[0] || user.email?.[0] || 'M').toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: theme.text, margin: 0 }}>{user.nombre || ''} {user.apellido || ''} {user.nombre ? '' : (user.email || 'Moderador')}</h2>
          <p style={{ fontSize: 12, color: theme.muted, margin: '2px 0 0' }}>{user.email || ''}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: theme.accent, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>📍 {ciudad}</span>
            <span style={{ padding: '3px 8px', borderRadius: 20, background: 'rgba(46,160,67,0.12)', color: theme.success, fontSize: 11, fontWeight: 600 }}>{drivers.length} conductores asignados</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: theme.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Región asignada</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: theme.text, margin: '2px 0 0', textTransform: 'capitalize' }}>{ciudad}</p>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        {[
          { label: 'Total Conductores', value: stats.drivers, max: Math.max(stats.drivers, 20), color: theme.accent, desc: `De ${ciudad}` },
          { label: 'Inactivos', sub: '7+ días sin viajes', value: stats.inactive, max: Math.max(stats.drivers, 10), color: '#8b949e', desc: 'Requieren notificación' },
          { label: 'Comunicados Pendientes', value: stats.comunicadosPend, max: Math.max(stats.comunicadosPend, 5), color: '#1f6feb', desc: 'Esperan aprobación admin' },
          { label: 'Avisos Activos', value: stats.avisos, max: Math.max(stats.avisos, 10), color: theme.success, desc: `En ${ciudad}` },
        ].map((k) => (
          <div key={k.label} style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <CircularProgress value={Number(k.value) || 0} max={k.max} color={k.color} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{k.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: theme.text, margin: '2px 0 0' }}>{k.value}</p>
              <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{k.desc || k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* DETAILED ANALYTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: theme.text, margin: '0 0 10px' }}>Estado de Conductores</h3>
          <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 6, overflow: 'hidden', background: '#21262d' }}>
            <div style={{ flex: online || 1, background: theme.success }} title={`Online ${online}`} />
            <div style={{ flex: offline || 1, background: '#8b949e' }} title={`Offline ${offline}`} />
            <div style={{ flex: pendingVerif || 1, background: '#d29922' }} title={`Pendiente ${pendingVerif}`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: theme.muted }}>
            <span>🟢 Online {online}</span>
            <span>⚫ Offline {offline}</span>
            <span>🟡 Pendiente {pendingVerif}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <MiniTrend data={trendData} color={theme.success} />
          </div>
        </div>
        <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, cursor: 'pointer' }} onClick={() => navigate('/moderator/comunicados')}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: theme.text, margin: 0 }}>Comunicados</h3>
          <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>{stats.comunicadosPend} pendientes • clic para gestionar</p>
        </div>
        <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, cursor: 'pointer' }} onClick={() => navigate('/moderator/avisos')}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: theme.text, margin: 0 }}>Avisos</h3>
          <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>{stats.avisos} activos en {ciudad}</p>
        </div>
      </div>

      {/* DYNAMIC DATA TABLE */}
      <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: theme.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tus Usuarios — Muestra</h3>
          <span style={{ fontSize: 11, color: theme.muted }}>{drivers.length} conductores • página {page} de {totalPages}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                <th style={thStyle}>Avatar / Nombre</th>
                <th style={thStyle}>Placa Vehículo</th>
                <th style={thStyle}>Teléfono</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: theme.muted, fontSize: 12 }}>No hay conductores en {ciudad}</td></tr>
              ) : (
                paginated.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {u.fotoConductor ? (
                          <img src={u.fotoConductor} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#21262d', color: '#8b949e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                            {(u.usuario?.nombre?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: 600, color: theme.text }}>{u.usuario?.nombre || ''}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{u.placa || '-'}</td>
                    <td style={tdStyle}>{u.usuario?.telefono || '-'}</td>
                    <td style={tdStyle}>{u.usuario?.email || '-'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => navigate('/moderator/drivers')} style={btnStyle}>Ver</button>
                        <button onClick={() => navigate('/moderator/drivers')} style={btnStyle}>Editar</button>
                        <button onClick={() => navigate('/moderator/drivers')} style={{ ...btnStyle, background: 'rgba(245,158,11,0.12)', color: theme.accent }}>Gestionar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: `1px solid ${theme.border}`, background: '#0d1117', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11, color: theme.muted }}>{paginated.length} filas • {drivers.length} total</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={pageBtn}>‹</button>
            <span style={{ fontSize: 11, color: theme.muted }}>{page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={pageBtn}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #21262d', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 12px', color: '#c9d1d9', whiteSpace: 'nowrap' };
const btnStyle = { padding: '4px 8px', borderRadius: 6, border: '1px solid #30363d', background: '#21262d', color: '#c9d1d9', fontSize: 11, cursor: 'pointer' };
const pageBtn = { width: 26, height: 26, borderRadius: 6, border: '1px solid #30363d', background: '#21262d', color: '#8b949e', cursor: 'pointer' };
