import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { ChevronRight, Siren, X } from 'lucide-react';
import {
  getModeratorTrips, getModeratorTripDetail, getModeratorEmergencies,
} from '../../api/moderator';
import { loadMapboxToken } from '../../components/maps/useMapboxToken';
import { tokenStore } from '../../api/axios';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { SOCKET_URL } from '../../config';
import { errorMessage, formatCurrency, formatDateTime, fullName, toList } from '../../utils/format';
import {
  PageHeader, DataTable, StatusBadge, Badge, Button, Select,
} from '../../components/ui';
import TripDetailModal from './trips/TripDetailModal';
import './trips/TripsPage.css';

const ALERT_SOUND = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

const ESTADO_OPTIONS = [
  ['', 'Todos (con conductor)'],
  ['pendiente', 'Pendiente'],
  ['aceptado', 'Aceptado'],
  ['en_curso', 'En curso'],
  ['finalizado', 'Finalizado'],
  ['sos', 'SOS'],
];

const SOCKET_BADGE = {
  conectado: ['success', 'En vivo'],
  desconectado: ['neutral', 'Desconectado'],
  error: ['danger', 'Sin conexión'],
};

const place = (r, key) => r[`${key}Direccion`] || r[key]?.direccion || (typeof r[key] === 'string' ? r[key] : '—');

export default function ModeratorTripsPage() {
  const { ciudadParams } = useModeratorCity();
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
  const selectedIdRef = useRef(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, limit: 50, ...ciudadParams };
      if (estado) params.estado = estado;
      const res = await getModeratorTrips(params);
      setTrips(toList(res.data, 'trips'));
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar viajes'));
    } finally {
      setLoading(false);
    }
  }, [estado, ciudadParams]);

  const fetchEmergencies = useCallback(async () => {
    try {
      const res = await getModeratorEmergencies({ page: 1, limit: 20, ...ciudadParams });
      setEmergencies(toList(res.data, 'emergencies'));
    } catch {
      // Silencioso: las emergencias son un complemento del detalle y llegan también por socket.
    }
  }, [ciudadParams]);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await getModeratorTripDetail(id);
      setDetail(res.data?.data || res.data);
    } catch (err) {
      setDetailError(err.response?.status === 404 ? 'Viaje no encontrado en tu ciudad' : errorMessage(err, 'Error al cargar detalle'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { fetchEmergencies(); }, [fetchEmergencies]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  // Mismo cargador que el resto de los mapas: una sola petición por sesión y el
  // nombre del campo (mapboxAccessToken) en un único sitio.
  useEffect(() => {
    let vivo = true;
    loadMapboxToken().then((t) => { if (vivo) setMapboxToken(t || null); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    const token = tokenStore.access;
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    const upsert = (payload) => (prev) => {
      const idx = prev.findIndex((t) => String(t.id) === String(payload.id));
      if (idx < 0) return [payload, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...payload };
      return next;
    };

    socket.on('connect', () => setSocketStatus('conectado'));
    socket.on('disconnect', () => setSocketStatus('desconectado'));
    socket.on('connect_error', () => setSocketStatus('error'));
    socket.on('moderator:trip:update', (payload) => {
      setTrips(upsert(payload));
      if (String(selectedIdRef.current) === String(payload.id)) fetchDetail(payload.id);
    });
    socket.on('moderator:emergency:update', (payload) => {
      setEmergencies(upsert(payload));
      if (payload.estado === 'pendiente') {
        setEmergencyBanner(payload);
        try {
          if (!audioRef.current) audioRef.current = new Audio(ALERT_SOUND);
          audioRef.current.play().catch(() => { /* autoplay bloqueado por el navegador */ });
        } catch {
          // Audio no soportado en este navegador.
        }
      }
      const current = selectedIdRef.current;
      if (current && String(payload.viajeId || payload.tripId) === String(current)) fetchDetail(current);
    });
    socket.on('emergency:alert', (payload) => {
      setEmergencyBanner(payload);
      setEmergencies((prev) => [payload, ...prev]);
    });
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
    return () => { socket.disconnect(); };
  }, [fetchDetail]);

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  };

  const refreshAfterEmergencyAction = () => {
    fetchDetail(selectedId);
    fetchEmergencies();
  };

  const columns = [
    { key: 'id', label: 'ID', render: (v) => <span className="text-mono text-primary-color">#{String(v).slice(0, 8)}</span> },
    { key: 'estado', label: 'Estado', render: (v, r) => <StatusBadge status={v} label={r.estadoLabel} /> },
    { key: 'origen', label: 'Origen', render: (_, r) => <span className="trips-place">{place(r, 'origen')}</span> },
    { key: 'destino', label: 'Destino', render: (_, r) => <span className="trips-place">{place(r, 'destino')}</span> },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_, c) => (c.cliente ? (
        <div className="cell-user__text">
          <span className="cell-user__name">{fullName(c.cliente)}</span>
          {c.cliente.telefono && <span className="cell-user__meta">{c.cliente.telefono}</span>}
        </div>
      ) : '—'),
    },
    {
      key: 'conductor',
      label: 'Conductor',
      render: (_, r) => (r.conductor ? (
        <div className="cell-user__text">
          <span className="cell-user__name">{r.conductor.nombre || r.conductor.telefono || '—'}</span>
          {r.conductor.placa && <span className="cell-user__meta text-mono">{r.conductor.placa}</span>}
        </div>
      ) : '—'),
    },
    {
      key: 'precio',
      label: 'Precio',
      align: 'right',
      render: (_, r) => {
        // El listado /api/moderator/trips no trae `precioCliente` (solo lo expone
        // el detalle vía `dinero`): se usa el final si ya está fijado, o el estimado.
        const p = r.precioFinal || r.precioEstimado;
        return p ? <span className="nowrap">{formatCurrency(p)}</span> : '—';
      },
    },
    { key: 'createdAt', label: 'Creado', render: (v) => <span className="nowrap text-muted">{formatDateTime(v)}</span> },
    {
      key: 'seguimiento',
      label: '',
      align: 'right',
      render: (_, r) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
          aria-label={`Ver seguimiento del viaje ${String(r.id).slice(0, 8)}`}
        >
          Seguimiento <ChevronRight size={14} />
        </Button>
      ),
    },
  ];

  const [socketVariant, socketLabel] = SOCKET_BADGE[socketStatus] || SOCKET_BADGE.desconectado;

  return (
    <div className="page">
      <PageHeader
        title="Viajes"
        description="Seguimiento en tiempo real de los viajes de tu ciudad."
        actions={(
          <Badge variant={socketVariant}>
            <span className="badge__dot" aria-hidden="true" />
            {socketLabel}
          </Badge>
        )}
      />

      <div className="toolbar">
        <Select
          className="trips-filter"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          aria-label="Filtrar por estado"
        >
          {ESTADO_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>

      {emergencyBanner && (
        <div className="trips-alert" role="alert">
          <span className="trips-alert__icon"><Siren size={18} /></span>
          <div className="trips-alert__text">
            <span className="trips-alert__title">
              Emergencia{emergencyBanner.usuario?.nombre ? ` · ${emergencyBanner.usuario.nombre}` : ''} · {emergencyBanner.motivo || 'Emergencia'}
            </span>
            <span className="trips-alert__meta">
              Viaje #{emergencyBanner.viajeId || '—'}{emergencyBanner.createdAt ? ` · ${formatDateTime(emergencyBanner.createdAt)}` : ''}
            </span>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setEmergencyBanner(null)} aria-label="Descartar aviso">
            <X size={15} />
          </Button>
        </div>
      )}

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={trips}
        loading={loading}
        emptyMessage="No hay viajes en tu ciudad con los filtros actuales"
        onRowClick={(r) => setSelectedId(r.id)}
      />

      <TripDetailModal
        isOpen={!!selectedId}
        onClose={closeDetail}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        mapboxToken={mapboxToken}
        emergencies={emergencies}
        onEmergencyChanged={refreshAfterEmergencyAction}
      />
    </div>
  );
}
