import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModeratorDashboard, getModeratorDrivers, getModeratorComunicados, getAvisos } from '../../api/moderator';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const ciudad = user.zonaModerador || user.zona_moderador || 'tu ciudad';
  const [stats, setStats] = useState({ drivers: '-', inactive: '-', comunicados: '-', avisos: '-' });
  const [detail, setDetail] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getModeratorDashboard();
        if (cancelled) return;
        const d = res.data;
        setStats({
          drivers: d.totalDrivers ?? d.drivers ?? '—',
          inactive: d.inactiveDrivers ?? d.inactive ?? '—',
          comunicados: d.totalComunicados ?? d.comunicados ?? '—',
          avisos: d.totalAvisos ?? d.avisos ?? '—',
        });
      } catch {
        if (!cancelled) setStats({ drivers: '—', inactive: '—', comunicados: '—', avisos: '—' });
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dRes, cRes, aRes] = await Promise.all([
          getModeratorDrivers({ page: 1, limit: 50 }),
          getModeratorComunicados({ page: 1, limit: 50 }),
          getAvisos({ page: 1, limit: 50 }),
        ]);
        if (cancelled) return;
        const drivers = Array.isArray(dRes.data) ? dRes.data : (dRes.data.drivers || dRes.data.data || []);
        const comunicados = Array.isArray(cRes.data) ? cRes.data : (cRes.data.data || []);
        const avisos = Array.isArray(aRes.data) ? aRes.data : (aRes.data.data || []);
        const online = drivers.filter((d) => d.online).length;
        const pendingVerif = drivers.filter((d) => (d.estadoVerificacion || d.estado_verificacion) === 'pendiente').length;
        const comPend = comunicados.filter((c) => (c.estado || 'pendiente') === 'pendiente').length;
        const comAprob = comunicados.filter((c) => c.estado === 'aprobado').length;
        const avisosFij = avisos.filter((a) => a.fijado || a.pinned).length;
        setDetail({ online, offline: drivers.length - online, pendingVerif, comPend, comAprob, avisosFij, avisosTotal: avisos.length });
        setUsers(drivers.slice(0, 5));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { title: 'Conductores', value: stats.drivers, icon: '👥', color: theme.accent, to: '/moderator/drivers', desc: 'De tu ciudad' },
    { title: 'Inactivos', value: stats.inactive, icon: '😴', color: '#64748b', to: '/moderator/drivers/inactive', desc: '7+ días sin viajes' },
    { title: 'Comunicados', value: stats.comunicados, icon: '📢', color: '#06b6d4', to: '/moderator/comunicados', desc: 'Pendientes/aprobados' },
    { title: 'Avisos', value: stats.avisos, icon: '📌', color: theme.success, to: '/moderator/avisos', desc: 'De tu ciudad' },
  ];

  if (loading) return <div style={{ padding: 40, color: theme.muted, textAlign: 'center' }}>Cargando dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: `linear-gradient(135deg, ${theme.cards} 0%, #1a1205 100%)`, border: `1px solid ${theme.accent}40`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${theme.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: theme.text, margin: 0, textTransform: 'capitalize' }}>Moderador de {ciudad}</h2>
            <p style={{ fontSize: 12, color: theme.muted, margin: '2px 0 0' }}>{user.nombre || ''} {user.apellido || ''} • {user.email || ''}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Tu ciudad</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: theme.text, margin: '2px 0 0', textTransform: 'capitalize' }}>{ciudad}</p>
          <p style={{ fontSize: 11, color: theme.muted, margin: 0 }}>{stats.drivers !== '-' ? `${stats.drivers} conductores asignados` : ''}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
        {cards.map((c) => (
          <div key={c.title} onClick={() => navigate(c.to)} style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'transform 0.15s, border-color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{c.icon}</div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: theme.muted, textTransform: 'uppercase', margin: 0 }}>{c.title}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: theme.text, margin: '2px 0 0' }}>{c.value}</p>
              <p style={{ fontSize: 11, color: theme.muted, margin: '2px 0 0' }}>{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {detail && (
        <div style={{ background: 'rgba(15,18,32,0.6)', border: `1px solid ${theme.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: 0 }}>Estadísticas de {ciudad} — lo importante</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
            <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: theme.muted, textTransform: 'uppercase', margin: '0 0 4px' }}>Conductores</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: theme.text, margin: 0 }}>{detail.online + detail.offline} total</p>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}><div style={{ flex: detail.online || 1, background: '#22c55e', height: 6, borderRadius: 3 }} /><div style={{ flex: detail.offline || 1, background: '#64748b', height: 6, borderRadius: 3 }} /></div>
              <p style={{ fontSize: 11, color: theme.muted, margin: '6px 0 0' }}>🟢 {detail.online} en línea • ⚫ {detail.offline} offline • {detail.pendingVerif} por verificar</p>
            </div>
            <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, cursor: 'pointer' }} onClick={() => navigate('/moderator/comunicados')}>
              <p style={{ fontSize: 10, fontWeight: 600, color: theme.muted, textTransform: 'uppercase', margin: '0 0 4px' }}>Comunicados</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: theme.text, margin: 0 }}>{detail.comPend} pendientes</p>
              <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>{detail.comAprob} aprobados</p>
            </div>
            <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, cursor: 'pointer' }} onClick={() => navigate('/moderator/avisos')}>
              <p style={{ fontSize: 10, fontWeight: 600, color: theme.muted, textTransform: 'uppercase', margin: '0 0 4px' }}>Avisos</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: theme.text, margin: 0 }}>{detail.avisosTotal} total</p>
              <p style={{ fontSize: 11, color: theme.muted, margin: '4px 0 0' }}>📌 {detail.avisosFij} fijados</p>
            </div>
          </div>
          {users.length > 0 && (
            <div style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', margin: '0 0 8px' }}>Tus usuarios de {ciudad} — muestra</p>
              {users.map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${theme.border}` }}>
                  <span style={{ fontSize: 12, color: theme.text }}>{u.usuario?.nombre || ''} • {u.placa || ''}</span>
                  <span style={{ fontSize: 11, color: theme.muted }}>{u.usuario?.email || ''}</span>
                </div>
              ))}
              <button onClick={() => navigate('/moderator/drivers')} style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.accent, fontSize: 11, cursor: 'pointer' }}>Ver todos →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
