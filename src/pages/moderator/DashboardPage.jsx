import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  getModeratorDrivers,
  getInactiveDrivers,
  getModeratorComunicados,
  getModeratorEmergencies,
  getModeratorTrips,
  getConversations,
  getModeratorProfile,
} from '../../api/moderator';
import { useModeratorBadges } from '../../contexts/ModeratorBadgesContext';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import StatsCard from '../../components/admin/StatsCard';
import Card from '../../components/ui/Card/Card';
import Badge from '../../components/ui/Badge/Badge';
import Button from '../../components/ui/Button/Button';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import './DashboardPage.css';

const SOCKET_URL = 'https://bakend-cargaexpress-production.up.railway.app';

const normalizeList = (d) => {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  if (d && Array.isArray(d.drivers)) return d.drivers;
  if (d && Array.isArray(d.trips)) return d.trips;
  if (d && Array.isArray(d.emergencies)) return d.emergencies;
  if (d && Array.isArray(d.conversations)) return d.conversations;
  return [];
};

const timeHM = (v) => (v ? new Date(v).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '');

const timeAgo = (v) => {
  if (!v) return '';
  const diff = Date.now() - new Date(v).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'Ahora';
  const m = Math.floor(s / 60);
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  return `Hace ${d} días`;
};

const tripRoute = (t) => {
  const from = t.origenDireccion || (typeof t.origen === 'string' ? t.origen : t.origen?.direccion || t.origen?.nombre) || '—';
  const to = t.destinoDireccion || (typeof t.destino === 'string' ? t.destino : t.destino?.direccion || t.destino?.nombre) || '—';
  return `${from} → ${to}`;
};

const tripConductor = (t) => {
  if (!t.conductor) return null;
  return t.conductor.nombre || t.conductor.telefono || t.conductor.placa || null;
};

const tripVariant = { en_curso: 'warning', aceptado: 'primary', sos: 'danger', finalizado: 'success', completado: 'success', pendiente: 'neutral', cancelado: 'danger' };
const emergVariant = { pendiente: 'danger', atendida: 'warning', resuelta: 'success' };

const TRIP_ORDER = { en_curso: 0, sos: 1, aceptado: 2 };
const ACTIVE_TRIP_STATES = ['aceptado', 'en_curso', 'sos'];
const ACTIVE_EMERGENCY_STATES = ['pendiente', 'atendida'];

const mergeItem = (prev, item) => {
  if (!item || typeof item !== 'object' || !item.id) return prev;
  const idx = prev.findIndex((x) => String(x.id) === String(item.id));
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = { ...next[idx], ...item };
    return next;
  }
  return [item, ...prev];
};

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const { emergencyBadge, unreadBadge } = useModeratorBadges();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { /* perfil inicial vacío */ }
    return {};
  });
  const [drivers, setDrivers] = useState([]);
  const [inactive, setInactive] = useState(0);
  const [comunicados, setComunicados] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [trips, setTrips] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [socketStatus, setSocketStatus] = useState('conectando');
  const { ciudadParams } = useModeratorCity();

  const myId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { /* sin sesión local */ }
    return null;
  })();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      getModeratorDrivers({ page: 1, limit: 100, ...ciudadParams }),
      getInactiveDrivers({ page: 1, limit: 100, ...ciudadParams }),
      getModeratorComunicados({ page: 1, limit: 100, ...ciudadParams }),
      getModeratorEmergencies({ page: 1, limit: 100, ...ciudadParams }),
      getModeratorTrips({ page: 1, limit: 100, ...ciudadParams }),
      getConversations({ page: 1, limit: 50, ...ciudadParams }),
    ]);
    if (results[0].status === 'fulfilled') setDrivers(normalizeList(results[0].value.data));
    if (results[1].status === 'fulfilled') setInactive(normalizeList(results[1].value.data).length);
    if (results[2].status === 'fulfilled') setComunicados(normalizeList(results[2].value.data));
    if (results[3].status === 'fulfilled') setEmergencies(normalizeList(results[3].value.data));
    if (results[4].status === 'fulfilled') setTrips(normalizeList(results[4].value.data));
    if (results[5].status === 'fulfilled') setConversations(normalizeList(results[5].value.data));
    setUpdatedAt(new Date());
    setLoading(false);
  }, [ciudadParams]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    let cancelled = false;
    getModeratorProfile()
      .then((res) => {
        if (cancelled) return;
        const u = res.data?.user || res.data?.data || res.data;
        if (u && typeof u === 'object') setUser((prev) => ({ ...prev, ...u }));
      })
      .catch(() => { /* perfil no disponible, se conserva el de sesión */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    socket.on('connect', () => setSocketStatus('conectado'));
    socket.on('disconnect', () => setSocketStatus('desconectado'));
    socket.on('connect_error', () => setSocketStatus('error'));
    socket.on('moderator:trip:update', (payload) => {
      setTrips((prev) => mergeItem(prev, payload));
      setUpdatedAt(new Date());
    });
    socket.on('moderator:emergency:update', (payload) => {
      setEmergencies((prev) => mergeItem(prev, payload));
      setUpdatedAt(new Date());
    });
    socket.on('emergency:alert', (payload) => {
      setEmergencies((prev) => mergeItem(prev, payload));
      setUpdatedAt(new Date());
    });
    socket.on('conversation:message', (payload) => {
      const convId = payload.conversacionId || payload.conversationId;
      const fromMe = payload.remitente?.id === myId;
      if (convId) {
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(convId)
              ? {
                  ...c,
                  ultimoMensaje: payload.mensaje ?? c.ultimoMensaje,
                  ultimoMensajeAt: payload.createdAt || c.ultimoMensajeAt,
                  updatedAt: payload.createdAt || c.updatedAt,
                  noLeidos: fromMe ? (c.noLeidos || 0) : (c.noLeidos || 0) + 1,
                }
              : c,
          ),
        );
      }
      setUpdatedAt(new Date());
    });
    return () => { socket.disconnect(); };
  }, [myId]);

  const ciudad = user.zonaModerador || user.zona_moderador || '—';
  const userName = [`${user.nombre || ''} ${user.apellido || ''}`.trim(), user.email].filter(Boolean).join(' · ') || 'Moderador';

  const asignados = drivers.length;
  const online = drivers.filter((d) => d.online).length;
  const offline = Math.max(0, asignados - online);
  const pendVerif = drivers.filter((d) => (d.estadoVerificacion || d.estado_verificacion || '') === 'pendiente').length;

  const activeTrips = trips.filter((t) => ACTIVE_TRIP_STATES.includes((t.estado || '').toLowerCase()));
  const enCurso = activeTrips.filter((t) => t.estado === 'en_curso').length;

  const activeEmergencies = emergencies.filter((e) => ACTIVE_EMERGENCY_STATES.includes((e.estado || '').toLowerCase()));
  const pendEmerg = activeEmergencies.filter((e) => e.estado === 'pendiente').length;

  const comunicadosPend = comunicados.filter((c) => ((c.estado || 'pendiente').toLowerCase()) === 'pendiente').length;
  const pendientesAction = pendVerif + comunicadosPend;

  const kpis = [
    { title: 'Conductores', value: asignados, subtitle: `${online} en línea`, icon: '🚚', color: 'var(--primary)', to: '/moderator/drivers' },
    { title: 'Viajes', value: activeTrips.length, subtitle: `${enCurso} en curso`, icon: '🧭', color: 'var(--info)', to: '/moderator/trips' },
    { title: 'Emergencias', value: emergencyBadge, subtitle: `${pendEmerg} pendientes`, icon: '🚨', color: 'var(--danger)', to: '/moderator/emergencies' },
    { title: 'Pendientes', value: pendientesAction, subtitle: 'Requieren acción', icon: '⏳', color: 'var(--warning)', to: '/moderator/comunicados' },
    { title: 'Comunicaciones', value: unreadBadge, subtitle: 'Sin responder', icon: '💬', color: 'var(--primary)', to: '/moderator/conversations' },
  ];

  const tripsToShow = [...activeTrips]
    .sort((a, b) => {
      const oa = TRIP_ORDER[a.estado] ?? 3;
      const ob = TRIP_ORDER[b.estado] ?? 3;
      if (oa !== ob) return oa - ob;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    })
    .slice(0, 6);

  const emeToShow = [...activeEmergencies]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 4);

  const convToShow = [...conversations]
    .sort((a, b) => {
      const dif = (b.noLeidos || 0) - (a.noLeidos || 0);
      if (dif !== 0) return dif;
      return new Date(b.updatedAt || b.ultimoMensajeAt || 0) - new Date(a.updatedAt || a.ultimoMensajeAt || 0);
    })
    .slice(0, 3);

  const activity = useMemo(() => {
    const events = [];
    emergencies.forEach((e) => {
      if (e.createdAt) events.push({ time: e.createdAt, kind: 'emergency', text: `Emergencia #${String(e.id).slice(0, 8)} — ${e.usuario?.nombre || e.motivo || 'Regular'}` });
    });
    trips.forEach((t) => {
      if (t.createdAt) events.push({ time: t.createdAt, kind: 'trip', text: `Viaje ${tripRoute(t)} — ${t.estadoLabel || t.estado || ''}` });
    });
    conversations.forEach((c) => {
      const t = c.ultimoMensajeAt || c.updatedAt;
      if (t) events.push({ time: t, kind: 'message', text: `Nuevo mensaje — ${(c.usuario || c)?.nombre || 'Conversación'}` });
    });
    return events.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  }, [emergencies, trips, conversations]);

  const activityDot = { emergency: 'var(--danger)', trip: 'var(--info)', message: 'var(--primary)' };

  if (loading) return <LoadingState message="Cargando centro de control..." />;

  return (
    <div className="ccop">
      {/* Encabezado del centro de control */}
      <div className="ccop-hero">
        <div>
          <div className="ccop-hero__badges">
            <Badge variant="primary">Moderador</Badge>
            <Badge variant="neutral">📍 {ciudad}</Badge>
          </div>
          <h2 className="ccop-hero__title">Centro de Control Operativo</h2>
          <p className="ccop-hero__desc">Supervisa conductores, viajes, emergencias y comunicaciones de Carga Express GV.</p>
          <p className="ccop-hero__user">{userName}</p>
        </div>
        <div className="ccop-hero__status">
          <span className={`ccop-live ${socketStatus === 'conectado' ? 'ccop-live--on' : 'ccop-live--off'}`}>
            <span className="ccop-live__dot" />
            {socketStatus === 'conectado' ? 'En tiempo real' : socketStatus === 'conectando' ? 'Conectando...' : socketStatus === 'error' ? 'Reconectando' : 'Desconectado'}
          </span>
          {updatedAt && <p className="ccop-updated">Actualizado a las {timeHM(updatedAt)}</p>}
          <Button variant="outline" size="sm" icon="↻" onClick={fetchAll}>Actualizar</Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="ccop-kpis">
        {kpis.map((k) => (
          <StatsCard key={k.title} title={k.title} value={k.value} icon={k.icon} color={k.color} subtitle={k.subtitle} to={k.to} />
        ))}
      </div>

      {/* Fila 1: Conductores + Viajes */}
      <div className="ccop-row">
        <Card
          title="Estado de conductores"
          description={`${asignados} conductores asignados en ${ciudad}`}
          actions={<Button variant="ghost" size="sm" onClick={() => navigate('/moderator/drivers')}>Ver →</Button>}
        >
          <div className="ccop-bar" role="img" aria-label="Disponibilidad de conductores">
            {online > 0 && <div className="ccop-bar__seg" style={{ flexBasis: `${(online / Math.max(asignados, 1)) * 100}%`, background: 'var(--success)' }} title={`${online} en línea`} />}
            {offline > 0 && <div className="ccop-bar__seg" style={{ flexBasis: `${(offline / Math.max(asignados, 1)) * 100}%`, background: 'var(--text-disabled)' }} title={`${offline} desconectados`} />}
          </div>
          <div className="ccop-legend">
            <span className="ccop-legend__item"><span className="ccop-legend__dot" style={{ background: 'var(--success)' }} /> {online} en línea</span>
            <span className="ccop-legend__item"><span className="ccop-legend__dot" style={{ background: 'var(--text-disabled)' }} /> {offline} desconectados</span>
            {pendVerif > 0 && <span className="ccop-legend__item"><span className="ccop-legend__dot" style={{ background: 'var(--warning)' }} /> {pendVerif} con verificación pendiente</span>}
          </div>
          {inactive > 0 && <p className="ccop-item__sub">{inactive} conductores inactivos (7+ días sin viajes)</p>}
        </Card>

        <Card
          title="Viajes en tiempo real"
          description="En curso, aceptados y SOS"
          actions={<Button variant="ghost" size="sm" onClick={() => navigate('/moderator/trips')}>Ver →</Button>}
        >
          {tripsToShow.length === 0 ? (
            <EmptyState icon="🚚" title="Información de viajes no disponible" description="Los viajes aparecerán aquí cuando estén disponibles." />
          ) : (
            <div className="ccop-list">
              {tripsToShow.map((t) => (
                <div className="ccop-item" key={t.id}>
                  <div className="ccop-item__icon">🚚</div>
                  <div className="ccop-item__body">
                    <p className="ccop-item__title">{tripRoute(t)}</p>
                    <p className="ccop-item__sub">{tripConductor(t) || 'Sin conductor asignado'} · #{String(t.id).slice(0, 8)}</p>
                  </div>
                  <div className="ccop-item__extra">
                    <Badge variant={tripVariant[t.estado] || 'neutral'}>{t.estadoLabel || t.estado || '—'}</Badge>
                    <span className="ccop-item__time">{t.createdAt ? timeHM(t.createdAt) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Fila 2: Emergencias + Comunicaciones */}
      <div className="ccop-row">
        <Card
          title="Emergencias pendientes"
          description={activeEmergencies.length > 0 ? `${activeEmergencies.length} caso(s) activo(s)` : 'Casos activos que requieren atención'}
          actions={<Button variant="ghost" size="sm" onClick={() => navigate('/moderator/emergencies')}>Ver →</Button>}
        >
          {emeToShow.length === 0 ? (
            <EmptyState icon="🚨" title="Sin emergencias pendientes" description="Los casos activos aparecerán aquí." />
          ) : (
            <div className="ccop-list">
              {emeToShow.map((e) => {
                const coord = e.lat && e.lng ? `📍 ${Number(e.lat).toFixed(3)}, ${Number(e.lng).toFixed(3)}` : null;
                const conductor = e.usuario?.nombre ? `${e.usuario.nombre}${e.usuario.telefono ? ` · ${e.usuario.telefono}` : ''}` : null;
                const subParts = [conductor, coord, e.usuario?.nombre ? null : `Caso #${String(e.id).slice(0, 8)}`, timeAgo(e.createdAt)].filter(Boolean);
                return (
                  <div className="ccop-item" key={e.id}>
                    <div className="ccop-item__icon" style={{ borderColor: 'var(--danger-border)' }}>🚨</div>
                    <div className="ccop-item__body">
                      <p className="ccop-item__title">{e.motivo || `Caso #${String(e.id).slice(0, 8)}`}</p>
                      <p className="ccop-item__sub">{subParts.join(' · ')}</p>
                    </div>
                    <div className="ccop-item__extra">
                      <Badge variant={emergVariant[e.estado] || 'neutral'}>{e.estadoLabel || e.estado}</Badge>
                      <Button variant="danger" size="sm" onClick={() => navigate('/moderator/emergencies')}>Atender</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Comunicaciones"
          description={`${unreadBadge} mensajes sin responder`}
          actions={<Button variant="ghost" size="sm" onClick={() => navigate('/moderator/conversations')}>Abrir conversatorio →</Button>}
        >
          {convToShow.length === 0 ? (
            <EmptyState icon="💬" title="Sin conversaciones pendientes" description="Las conversaciones con clientes y conductores aparecerán aquí." />
          ) : (
            <div className="ccop-list">
              {convToShow.map((c) => {
                const u = c.usuario || c;
                return (
                  <div className="ccop-item" key={c.id}>
                    <div className="ccop-item__icon">💬</div>
                    <div className="ccop-item__body">
                      <p className="ccop-item__title">
                        {u.nombre || c.nombre || 'Usuario'}
                        {u.esModerador ? ` · ${u.zonaModerador || u.ciudad || 'Moderador'}` : u.ciudad ? ` · ${u.ciudad}` : ''}
                      </p>
                      <p className="ccop-item__sub">{c.ultimoMensaje || 'Sin mensajes'}</p>
                    </div>
                    <div className="ccop-item__extra">
                      {c.noLeidos > 0 && <Badge variant="danger">{c.noLeidos}</Badge>}
                      <span className="ccop-item__time">{timeAgo(c.ultimoMensajeAt || c.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {comunicadosPend > 0 && (
            <button className="ccop-footer-link" onClick={() => navigate('/moderator/comunicados')}>
              {comunicadosPend} comunicado{comunicadosPend > 1 ? 's' : ''} pendiente{comunicadosPend > 1 ? 's' : ''} de aprobación →
            </button>
          )}
        </Card>
      </div>

      {/* Fila 3: Actividad + Acciones */}
      <div className="ccop-row">
        <Card title="Actividad reciente" description="Últimos movimientos de la operación">
          {activity.length === 0 ? (
            <EmptyState icon="🕘" title="No hay actividad reciente disponible." description="Los eventos aparecerán aquí conforme ocurran." />
          ) : (
            <div className="ccop-list">
              {activity.map((a, i) => (
                <div className="ccop-activity" key={`${a.time}-${i}`}>
                  <span className="ccop-activity__dot" style={{ background: activityDot[a.kind] }} />
                  <p className="ccop-activity__text">{a.text}</p>
                  <span className="ccop-item__time" style={{ marginLeft: 'auto' }}>{timeHM(a.time)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Acciones rápidas" description="Atajos a las secciones de moderación">
          <div className="ccop-actions">
            <Button variant="danger" icon="🚨" onClick={() => navigate('/moderator/emergencies')}>Gestionar emergencias</Button>
            <Button variant="primary" icon="💬" onClick={() => navigate('/moderator/conversations')}>Abrir conversatorio</Button>
            <Button variant="secondary" icon="🚚" onClick={() => navigate('/moderator/drivers')}>Ver conductores</Button>
            <Button variant="secondary" icon="🧭" onClick={() => navigate('/moderator/trips')}>Ver viajes</Button>
            <Button variant="secondary" icon="📢" onClick={() => navigate('/moderator/comunicados')}>Gestionar comunicados</Button>
            <Button variant="secondary" icon="📋" onClick={() => navigate('/moderator/encuestas')}>Encuestas</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}