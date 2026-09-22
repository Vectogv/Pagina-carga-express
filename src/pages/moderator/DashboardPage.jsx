import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ArrowRight, ClipboardList, Clock, Inbox, MapPin, Megaphone, MessageSquare, Navigation, RefreshCw, Siren, Truck,
} from 'lucide-react';
import {
  getModeratorDrivers,
  getInactiveDrivers,
  getModeratorComunicados,
  getModeratorEmergencies,
  getModeratorTrips,
  getConversations,
  getModeratorProfile,
} from '../../api/moderator';
import { tokenStore } from '../../api/axios';
import { useModeratorBadges } from '../../contexts/ModeratorBadgesContext';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { SOCKET_URL } from '../../config';
import { formatTime, timeAgo, toList } from '../../utils/format';
import {
  PageHeader, StatCard, Card, Badge, Button, StatusBadge, LoadingState,
} from '../../components/ui';
import ZoneLimitCard from '../../components/maps/ZoneLimitCard';
import './DashboardPage.css';

const LIST_KEYS = ['drivers', 'trips', 'emergencies', 'conversations'];
const normalizeList = (d) => toList(d, ...LIST_KEYS);

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    // Usuario guardado corrupto: se usa el perfil del backend.
    return {};
  }
};

const tripRoute = (t) => {
  const from = t.origenDireccion || (typeof t.origen === 'string' ? t.origen : t.origen?.direccion || t.origen?.nombre) || '—';
  const to = t.destinoDireccion || (typeof t.destino === 'string' ? t.destino : t.destino?.direccion || t.destino?.nombre) || '—';
  return `${from} → ${to}`;
};

const tripConductor = (t) => (t.conductor ? t.conductor.nombre || t.conductor.telefono || t.conductor.placa || null : null);

const TRIP_ORDER = { en_curso: 0, sos: 1, aceptado: 2 };
const ACTIVE_TRIP_STATES = ['aceptado', 'en_curso', 'sos'];
const ACTIVE_EMERGENCY_STATES = ['pendiente', 'atendida'];

const LIVE_LABEL = {
  conectado: 'En tiempo real',
  conectando: 'Conectando…',
  error: 'Reconectando',
  desconectado: 'Desconectado',
};

const ACTIVITY_ICON = { emergency: Siren, trip: Truck, message: MessageSquare };

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

function PanelEmpty({ icon: Icon = Inbox, title, description }) {
  return (
    <div className="ccop-empty">
      <span className="ccop-empty__icon"><Icon size={18} /></span>
      <p className="ccop-empty__title">{title}</p>
      {description && <p className="ccop-empty__text">{description}</p>}
    </div>
  );
}

function SeeAll({ to, label = 'Ver todo' }) {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" onClick={() => navigate(to)}>
      {label} <ArrowRight size={14} />
    </Button>
  );
}

export default function ModeratorDashboard() {
  const navigate = useNavigate();
  const { emergencyBadge, unreadBadge } = useModeratorBadges();
  const { ciudadParams } = useModeratorCity();
  const [user, setUser] = useState(readStoredUser);
  const [drivers, setDrivers] = useState([]);
  const [inactive, setInactive] = useState(0);
  const [comunicados, setComunicados] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [trips, setTrips] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [socketStatus, setSocketStatus] = useState('conectando');

  const myId = readStoredUser().id ?? null;

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
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
    if (results[2].status === 'fulfilled') setComunicados(toList(results[2].value.data, 'comunicados'));
    if (results[3].status === 'fulfilled') setEmergencies(normalizeList(results[3].value.data));
    if (results[4].status === 'fulfilled') setTrips(normalizeList(results[4].value.data));
    if (results[5].status === 'fulfilled') setConversations(normalizeList(results[5].value.data));
    setUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [ciudadParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    const token = tokenStore.access;
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
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
        setConversations((prev) => prev.map((c) => (
          String(c.id) === String(convId)
            ? {
              ...c,
              ultimoMensaje: payload.mensaje ?? c.ultimoMensaje,
              ultimoMensajeAt: payload.createdAt || c.ultimoMensajeAt,
              updatedAt: payload.createdAt || c.updatedAt,
              noLeidos: fromMe ? (c.noLeidos || 0) : (c.noLeidos || 0) + 1,
            }
            : c
        )));
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
    { title: 'Conductores', value: asignados, subtitle: `${online} en línea`, icon: <Truck size={16} />, color: 'var(--primary)', to: '/moderator/drivers' },
    { title: 'Viajes activos', value: activeTrips.length, subtitle: `${enCurso} en curso`, icon: <Navigation size={16} />, color: 'var(--info)', to: '/moderator/trips' },
    { title: 'Emergencias', value: emergencyBadge, subtitle: `${pendEmerg} pendientes`, icon: <Siren size={16} />, color: 'var(--danger)', to: '/moderator/emergencies' },
    { title: 'Pendientes', value: pendientesAction, subtitle: 'Requieren acción', icon: <Clock size={16} />, color: 'var(--warning)', to: '/moderator/comunicados' },
    { title: 'Comunicaciones', value: unreadBadge, subtitle: 'Sin responder', icon: <MessageSquare size={16} />, color: 'var(--accent-violet)', to: '/moderator/conversations' },
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

  if (loading) return <div className="page"><LoadingState message="Cargando centro de control…" /></div>;

  const onlinePct = (online / Math.max(asignados, 1)) * 100;
  const offlinePct = (offline / Math.max(asignados, 1)) * 100;

  return (
    <div className="page">
      <PageHeader
        title="Centro de control"
        description={(
          <span className="ccop-subtitle">
            <span className="ccop-subtitle__city"><MapPin size={13} /> {ciudad}</span>
            <span>{userName}</span>
          </span>
        )}
        actions={(
          <>
            <span className={`ccop-live ccop-live--${socketStatus === 'conectado' ? 'on' : 'off'}`} title={updatedAt ? `Actualizado a las ${formatTime(updatedAt)}` : undefined}>
              <span className="ccop-live__dot" aria-hidden="true" />
              {LIVE_LABEL[socketStatus] || LIVE_LABEL.desconectado}
            </span>
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} loading={refreshing} onClick={fetchAll}>
              Actualizar
            </Button>
          </>
        )}
      />

      <div className="stats-grid">
        {kpis.map((k) => (
          <StatCard key={k.title} title={k.title} value={k.value} icon={k.icon} color={k.color} subtitle={k.subtitle} to={k.to} />
        ))}
      </div>

      <ZoneLimitCard zonaClave={user.zonaModerador || user.zona_moderador} />

      <div className="two-col">
        <Card
          title="Estado de conductores"
          description={`${asignados} conductores asignados en ${ciudad}`}
          actions={<SeeAll to="/moderator/drivers" />}
        >
          <div className="ccop-bar" role="img" aria-label={`${online} en línea, ${offline} desconectados`}>
            {online > 0 && <div className="ccop-bar__seg ccop-bar__seg--online" style={{ flexBasis: `${onlinePct}%` }} />}
            {offline > 0 && <div className="ccop-bar__seg ccop-bar__seg--offline" style={{ flexBasis: `${offlinePct}%` }} />}
          </div>
          <div className="ccop-legend">
            <span className="ccop-legend__item"><span className="ccop-legend__dot ccop-legend__dot--online" /> {online} en línea</span>
            <span className="ccop-legend__item"><span className="ccop-legend__dot ccop-legend__dot--offline" /> {offline} desconectados</span>
            {pendVerif > 0 && (
              <span className="ccop-legend__item"><span className="ccop-legend__dot ccop-legend__dot--pending" /> {pendVerif} con verificación pendiente</span>
            )}
          </div>
          {inactive > 0 && (
            <button type="button" className="ccop-footer-link" onClick={() => navigate('/moderator/drivers/inactive')}>
              {inactive} conductores inactivos (7+ días sin viajes) <ArrowRight size={14} />
            </button>
          )}
        </Card>

        <Card title="Viajes en tiempo real" description="En curso, aceptados y SOS" actions={<SeeAll to="/moderator/trips" />}>
          {tripsToShow.length === 0 ? (
            <PanelEmpty icon={Truck} title="Sin viajes activos" description="Los viajes aparecerán aquí cuando estén en curso." />
          ) : (
            <ul className="ccop-list">
              {tripsToShow.map((t) => (
                <li className="ccop-item" key={t.id}>
                  <span className={`ccop-item__icon ${t.estado === 'sos' ? 'ccop-item__icon--danger' : ''}`}><Truck size={16} /></span>
                  <div className="ccop-item__body">
                    <p className="ccop-item__title">{tripRoute(t)}</p>
                    <p className="ccop-item__sub">{tripConductor(t) || 'Sin conductor asignado'} · #{String(t.id).slice(0, 8)}</p>
                  </div>
                  <div className="ccop-item__extra">
                    <StatusBadge status={t.estado} label={t.estadoLabel} size="sm" />
                    <span className="ccop-item__time">{formatTime(t.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="two-col">
        <Card
          title="Emergencias activas"
          description={activeEmergencies.length > 0 ? `${activeEmergencies.length} caso(s) activo(s)` : 'Casos que requieren atención'}
          actions={<SeeAll to="/moderator/emergencies" />}
        >
          {emeToShow.length === 0 ? (
            <PanelEmpty icon={Siren} title="Sin emergencias activas" description="Los casos activos aparecerán aquí." />
          ) : (
            <ul className="ccop-list">
              {emeToShow.map((e) => {
                const coord = e.lat && e.lng ? `${Number(e.lat).toFixed(3)}, ${Number(e.lng).toFixed(3)}` : null;
                const who = e.usuario?.nombre ? `${e.usuario.nombre}${e.usuario.telefono ? ` · ${e.usuario.telefono}` : ''}` : null;
                const subParts = [who, coord, e.usuario?.nombre ? null : `Caso #${String(e.id).slice(0, 8)}`, timeAgo(e.createdAt)].filter(Boolean);
                return (
                  <li className="ccop-item" key={e.id}>
                    <span className="ccop-item__icon ccop-item__icon--danger"><Siren size={16} /></span>
                    <div className="ccop-item__body">
                      <p className="ccop-item__title">{e.motivo || `Caso #${String(e.id).slice(0, 8)}`}</p>
                      <p className="ccop-item__sub">{subParts.join(' · ')}</p>
                    </div>
                    <div className="ccop-item__extra">
                      <StatusBadge status={e.estado} label={e.estadoLabel} size="sm" />
                      <Button variant="soft-danger" size="sm" onClick={() => navigate('/moderator/emergencies')}>Atender</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Comunicaciones"
          description={`${unreadBadge} mensajes sin responder`}
          actions={<SeeAll to="/moderator/conversations" label="Abrir conversatorio" />}
        >
          {convToShow.length === 0 ? (
            <PanelEmpty icon={MessageSquare} title="Sin conversaciones pendientes" description="Las conversaciones con clientes y conductores aparecerán aquí." />
          ) : (
            <ul className="ccop-list">
              {convToShow.map((c) => {
                const u = c.usuario || c;
                const suffix = u.esModerador ? ` · ${u.zonaModerador || u.ciudad || 'Moderador'}` : u.ciudad ? ` · ${u.ciudad}` : '';
                return (
                  <li className="ccop-item" key={c.id}>
                    <span className="ccop-item__icon"><MessageSquare size={16} /></span>
                    <div className="ccop-item__body">
                      <p className="ccop-item__title">{u.nombre || c.nombre || 'Usuario'}{suffix}</p>
                      <p className="ccop-item__sub">{c.ultimoMensaje || 'Sin mensajes'}</p>
                    </div>
                    <div className="ccop-item__extra">
                      {c.noLeidos > 0 && <Badge variant="danger" size="sm">{c.noLeidos}</Badge>}
                      <span className="ccop-item__time">{timeAgo(c.ultimoMensajeAt || c.updatedAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {comunicadosPend > 0 && (
            <button type="button" className="ccop-footer-link" onClick={() => navigate('/moderator/comunicados')}>
              {comunicadosPend} comunicado{comunicadosPend > 1 ? 's' : ''} pendiente{comunicadosPend > 1 ? 's' : ''} de aprobación <ArrowRight size={14} />
            </button>
          )}
        </Card>
      </div>

      <div className="two-col">
        <Card title="Actividad reciente" description="Últimos movimientos de la operación">
          {activity.length === 0 ? (
            <PanelEmpty icon={Clock} title="Sin actividad reciente" description="Los eventos aparecerán aquí conforme ocurran." />
          ) : (
            <ul className="ccop-list ccop-list--compact">
              {activity.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.kind];
                return (
                  <li className="ccop-activity" key={`${a.time}-${i}`}>
                    <span className={`ccop-activity__icon ccop-activity__icon--${a.kind}`}><Icon size={13} /></span>
                    <p className="ccop-activity__text">{a.text}</p>
                    <span className="ccop-item__time">{formatTime(a.time)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Acciones rápidas" description="Atajos a las secciones de moderación">
          <div className="ccop-actions">
            <Button variant="soft-danger" icon={<Siren size={15} />} onClick={() => navigate('/moderator/emergencies')}>Gestionar emergencias</Button>
            <Button variant="soft-primary" icon={<MessageSquare size={15} />} onClick={() => navigate('/moderator/conversations')}>Abrir conversatorio</Button>
            <Button variant="secondary" icon={<Truck size={15} />} onClick={() => navigate('/moderator/drivers')}>Ver conductores</Button>
            <Button variant="secondary" icon={<Navigation size={15} />} onClick={() => navigate('/moderator/trips')}>Ver viajes</Button>
            <Button variant="secondary" icon={<Megaphone size={15} />} onClick={() => navigate('/moderator/comunicados')}>Comunicados</Button>
            <Button variant="secondary" icon={<ClipboardList size={15} />} onClick={() => navigate('/moderator/encuestas')}>Encuestas</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
