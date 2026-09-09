import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModeratorDrivers, getInactiveDrivers, getModeratorComunicados, getAvisos } from '../../api/moderator';

const theme = { bg: '#020208', cards: '#0f1220', accent: '#f59e0b', text: '#e2e8f0', muted: '#64748b', border: '#1e2238', success: '#22c55e', danger: '#ef4444' };

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ drivers: '-', inactive: '-', comunicados: '-', avisos: '-' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, i, c, a] = await Promise.allSettled([
          getModeratorDrivers({ page: 1, limit: 1 }),
          getInactiveDrivers({ page: 1, limit: 1 }),
          getModeratorComunicados({ page: 1, limit: 1 }),
          getAvisos({ page: 1, limit: 1 }),
        ]);
        if (cancelled) return;
        const count = (r) => {
          if (r.status !== 'fulfilled') return '—';
          const data = r.value.data;
          if (Array.isArray(data)) return data.length;
          return data.total ?? data.count ?? '—';
        };
        setStats({ drivers: count(d), inactive: count(i), comunicados: count(c), avisos: count(a) });
      } finally { if (!cancelled) setLoading(false); }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: `${theme.cards}`, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 20 }}>ℹ️</span>
        <p style={{ color: theme.muted, fontSize: 12, margin: 0, lineHeight: 1.6 }}>Todas las acciones están limitadas a tu <b style={{ color: theme.text }}>zonaModerador</b> (ciudad). Comunicados y encuestas que crees quedan <b>pendientes</b> hasta que el admin las apruebe. Usa la campana superior para ver notificaciones en tiempo real.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        {cards.map((c) => (
          <div key={c.title} onClick={() => navigate(c.to)} style={{ background: theme.cards, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.15s, border-color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{c.icon}</div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: theme.muted, textTransform: 'uppercase', margin: 0 }}>{c.title}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: theme.text, margin: '2px 0 0' }}>{c.value}</p>
              <p style={{ fontSize: 11, color: theme.muted, margin: '2px 0 0' }}>{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
