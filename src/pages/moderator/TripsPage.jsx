import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { direccionCorta } from '../../utils/direccion';
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

// El listado solo trae viajes con conductor asignado. El backend acepta varios estados separados por coma.
const EN_SERVICIO = 'aceptado,conductor_en_camino,conductor_llegada,en_curso,entregado,esperando_confirmacion';
const ESTADO_OPTIONS = [
  ['', 'Todos'],
  [EN_SERVICIO, 'En servicio'],
  ['pendiente_confirmacion', 'Cierre por resolver'],
  ['sos', 'SOS'],
  ['aceptado', 'Aceptado'],
  ['conductor_en_camino', 'Conductor en camino'],
  ['conductor_llegada', 'Conductor en el origen'],
  ['en_curso', 'En curso'],
  ['entregado', 'Entregado'],
  ['esperando_confirmacion', 'Esperando confirmación del cliente'],
  ['finalizado', 'Finalizado'],
  ['disputa', 'En disputa'],
  ['cancelado', 'Cancelado'],
];

const VALID_ESTADOS = new Set(ESTADO_OPTIONS.map(([v]) => v));

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
  // ?estado= permite llegar ya filtrado desde el Centro de control.
  const [searchParams, setSearchParams] = useSearchParams();
  const estadoParam = searchParams.get('estado') || '';
  const estado = VALID_ESTADOS.has(estadoParam) ? estadoParam : '';
  const setEstado = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('estado', value); else next.delete('estado');
    setSearchParams(next, { replace: true });
  };
  const estadoRef = useRef(estado);
  useEffect(() => { estadoRef.current = estado; }, [estado]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [socketStatus, setSocketStatus] = useState('desconectado');
  const [mapboxToken, setMapboxToken] = useState(null);
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
  const fetchEmergenciesRef = useRef(fetchEmergencies);
  useEffect(() => { fetchEmergenciesRef.current = fetchEmergencies; }, [fetchEmergencies]);
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
    // moderator:trip:update trae la fecha en timestamps.createdAt; la tabla la lee en createdAt.
    // Un viaje que ya no cumple el filtro sale de la lista; uno nuevo solo entra si lo cumple.
    const upsertTrip = (payload) => (prev) => {
      const trip = { ...payload, createdAt: payload.createdAt ?? payload.timestamps?.createdAt };
      const filtro = estadoRef.current;
      if (filtro && !filtro.split(',').includes(trip.estado)) {
        return prev.filter((t) => String(t.id) !== String(trip.id));
      }
      return upsert(trip)(prev);
    };

    socket.on('connect', () => setSocketStatus('conectado'));
    socket.on('disconnect', () => setSocketStatus('desconectado'));
    socket.on('connect_error', () => setSocketStatus('error'));
    socket.on('moderator:trip:update', (payload) => {
      setTrips(upsertTrip(payload));
      if (String(selectedIdRef.current) === String(payload.id)) fetchDetail(payload.id);
    });
    socket.on('moderator:emergency:update', (payload) => {
      // El aviso sonoro y el banner los muestra el EmergencyBanner global del layout.
      setEmergencies(upsert(payload));
      const current = selectedIdRef.current;
      if (current && String(payload.viajeId || payload.tripId) === String(current)) fetchDetail(current);
    });
    // Solo llega a admins y es de cualquier ciudad: se recarga con el filtro de ciudad del backend.
    socket.on('emergency:alert', () => fetchEmergenciesRef.current());
    return () => { socket.disconnect(); };
  }, [fetchDetail]);

  // ?viaje= abre el detalle al llegar desde un enlace de otra pantalla.
  const viajeParam = searchParams.get('viaje');
  useEffect(() => { if (viajeParam) setSelectedId(viajeParam); }, [viajeParam]);

  const closeDetail = () => {
    if (searchParams.has('viaje')) {
      const next = new URLSearchParams(searchParams);
      next.delete('viaje');
      setSearchParams(next, { replace: true });
    }
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  };

  const refreshAfterEmergencyAction = () => {
    fetchDetail(selectedId);
    fetchEmergencies();
    fetchTrips();
  };

  const columns = [
    {
      key: 'seguimiento',
      label: '',
      render: (_, r) => (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
          aria-label={`Ver seguimiento del viaje ${String(r.id).slice(0, 8)}`}
          title="Ver seguimiento"
        >
          <ChevronRight size={16} />
        </Button>
      ),
    },
    {
      key: 'id',
      label: 'ID',
      render: (v) => (
        <Link className="text-mono text-primary-color" to={`/moderator/trips?viaje=${v}`} onClick={(e) => e.stopPropagation()}>
          #{String(v).slice(0, 8)}
        </Link>
      ),
    },
    { key: 'estado', label: 'Estado', render: (v, r) => <StatusBadge status={v} label={r.estadoLabel} /> },
    { key: 'origen', label: 'Origen', render: (_, r) => <span className="trips-place" title={place(r, 'origen')}>{direccionCorta(place(r, 'origen'))}</span> },
    { key: 'destino', label: 'Destino', render: (_, r) => <span className="trips-place" title={place(r, 'destino')}>{direccionCorta(place(r, 'destino'))}</span> },
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
          {r.conductor.id ? (
            <Link className="cell-user__name" to={`/moderator/drivers/${r.conductor.id}`} onClick={(e) => e.stopPropagation()}>
              {r.conductor.nombre || r.conductor.telefono || '—'}
            </Link>
          ) : <span className="cell-user__name">{r.conductor.nombre || r.conductor.telefono || '—'}</span>}
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
  ];

  const [socketVariant, socketLabel] = SOCKET_BADGE[socketStatus] || SOCKET_BADGE.desconectado;

  return (
    <div className="page">
      <PageHeader
        title="Viajes"
        description="Seguimiento en tiempo real de los viajes con conductor asignado en tu ciudad."
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
