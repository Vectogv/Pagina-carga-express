import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ChevronRight, MapPin } from 'lucide-react';
import { tokenStore } from '../../api/axios';
import {
  getModeratorEmergencies, acknowledgeEmergency, resolveEmergency, getModeratorTripDetail, getEmergencyMessages, sendEmergencyMessage,
} from '../../api/moderator';
import { useModeratorBadges } from '../../contexts/ModeratorBadgesContext';
import { useModeratorCity } from '../../contexts/ModeratorCityContext';
import { SOCKET_URL } from '../../config';
import { errorMessage, formatDateTime, toList } from '../../utils/format';
import {
  PageHeader, SegmentedFilter, DataTable, Pagination, StatusBadge, Button, Toast, ToastContainer,
} from '../../components/ui';
import EmergencyDetailModal from './emergencias/EmergencyDetailModal';
import './emergencias/EmergenciasPage.css';

const LIMIT = 10;

const TABS = [
  { value: 'activas', label: 'Activas' },
  { value: 'historico', label: 'Resueltas' },
  { value: 'todas', label: 'Todas' },
];

const EMPTY_BY_TAB = {
  activas: 'No hay emergencias activas',
  historico: 'No hay emergencias resueltas',
  todas: 'No hay emergencias',
};

const mapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
const sameId = (a, b) => String(a) === String(b);

const resolveWithObservation = (id, observacion) => resolveEmergency(id, { observacion });

export default function ModeratorEmergenciasPage() {
  const { setOpenEmergency } = useModeratorBadges();
  const { ciudadParams } = useModeratorCity();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === searchParams.get('tab')) ? searchParams.get('tab') : 'activas';

  const [pageState, setPageState] = useState({ tab, page: 1 });
  const page = pageState.tab === tab ? pageState.page : 1;
  const [emergencies, setEmergencies] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const tabRef = useRef(tab);
  const selectedIdRef = useRef(null);
  const closeToast = useCallback(() => setToast(null), []);

  const setTab = (value) => {
    setSearchParams(value === 'activas' ? {} : { tab: value }, { replace: true });
    setPageState({ tab: value, page: 1 });
  };
  const setPage = (p) => setPageState({ tab, page: p });

  const fetchEmergencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT, ...ciudadParams };
      if (tab === 'activas') params.estado = 'pendiente,atendida';
      else if (tab === 'historico') params.estado = 'resuelta';
      const res = await getModeratorEmergencies(params);
      const d = res.data || {};
      const list = toList(d, 'emergencies');
      setEmergencies(list);
      const tp = d.totalPages ?? d.pagination?.totalPages ?? d.meta?.totalPages;
      setTotalPages(tp ?? (list.length === LIMIT ? page + 1 : page));
      setTotal(typeof (d.total ?? d.pagination?.total) === 'number' ? (d.total ?? d.pagination.total) : undefined);
    } catch (err) {
      if (err.response?.status === 403) setError('No tienes permisos de moderador o ciudad no asignada');
      else setError(errorMessage(err, 'Error al cargar emergencias'));
    } finally {
      setLoading(false);
    }
  }, [tab, page, ciudadParams]);

  useEffect(() => { fetchEmergencies(); }, [fetchEmergencies]);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => {
    selectedIdRef.current = selected?.id ?? null;
    setOpenEmergency(selected?.id ?? null);
  }, [selected, setOpenEmergency]);
  useEffect(() => () => setOpenEmergency(null), [setOpenEmergency]);

  useEffect(() => {
    const token = tokenStore.access;
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${token}` },
      query: { token: `Bearer ${token}` },
    });
    socket.on('moderator:emergency:update', (payload) => {
      const isActivas = tabRef.current === 'activas';
      setEmergencies((prev) => {
        const idx = prev.findIndex((e) => sameId(e.id, payload.id));
        if (idx >= 0) {
          if (isActivas && payload.estado === 'resuelta') return prev.filter((e) => !sameId(e.id, payload.id));
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        if (payload.estado === 'pendiente' && isActivas) return [payload, ...prev];
        return prev;
      });
      setSelected((prev) => (prev && sameId(prev.id, payload.id) ? { ...prev, ...payload } : prev));
    });
    socket.on('emergency:alert', (payload) => {
      if (tabRef.current !== 'activas') return;
      setEmergencies((prev) => (prev.some((e) => sameId(e.id, payload.id)) ? prev : [payload, ...prev]));
    });
    socket.on('emergency:message', (data) => {
      if (!selectedIdRef.current || !sameId(data.alertaId, selectedIdRef.current)) return;
      setMensajes((prev) => (prev.some((m) => sameId(m.id, data.id)) ? prev : [...prev, data]));
    });
    return () => { socket.disconnect(); };
  }, []);

  const showToast = (message, ok = true) => setToast({ message, variant: ok ? 'success' : 'danger' });

  const loadMessages = async (alertaId) => {
    setMensajesLoading(true);
    setMensajesError(null);
    try {
      const r = await getEmergencyMessages(alertaId);
      if (sameId(selectedIdRef.current, alertaId)) setMensajes(toList(r.data, 'messages'));
    } catch (err) {
      if (err.response?.status === 403) setMensajesError('No participas en este caso');
      else if (err.response?.status === 404) setMensajesError('Alerta no encontrada');
      else setMensajesError(errorMessage(err, 'Error al cargar mensajes'));
    } finally {
      setMensajesLoading(false);
    }
  };

  const openDetail = async (row) => {
    selectedIdRef.current = row.id;
    setSelected(row);
    setTripDetail(null);
    setMensajes([]);
    setMensajesError(null);
    setObservacion('');
    setNuevoTexto('');
    loadMessages(row.id);
    try {
      const res = await getModeratorTripDetail(row.viajeId || row.tripId || row.viaje?.id);
      if (sameId(selectedIdRef.current, row.id)) setTripDetail(res.data?.data || res.data);
    } catch {
      // Sin detalle del viaje: el caso se muestra solo con los datos de la alerta.
    }
  };

  const closeDetail = () => {
    selectedIdRef.current = null;
    setSelected(null);
    setTripDetail(null);
    setObservacion('');
  };

  const enviarMensaje = async () => {
    if (!nuevoTexto.trim() || enviando || !selected || selected.estado === 'resuelta') return;
    setEnviando(true);
    try {
      const res = await sendEmergencyMessage(selected.id, { mensaje: nuevoTexto.trim() });
      const msg = res.data;
      setMensajes((prev) => (prev.some((m) => sameId(m.id, msg.id)) ? prev : [...prev, msg]));
      setNuevoTexto('');
    } catch (err) {
      const s = err.response?.status;
      if (s === 403) showToast('No participas en este caso', false);
      else if (s === 422) showToast(errorMessage(err, 'Mensaje vacío'), false);
      else showToast(errorMessage(err, 'Error al enviar'), false);
    } finally {
      setEnviando(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selected) return;
    const id = selected.id;
    setActionLoading(id);
    try {
      const { data: updated } = await acknowledgeEmergency(id);
      const patch = {
        estado: updated.estado || 'atendida',
        estadoLabel: updated.estadoLabel,
        administrador: updated.atendidoPor,
        atendidaAt: updated.atendidaAt,
      };
      setSelected((prev) => ({ ...prev, ...patch }));
      setEmergencies((prev) => prev.map((e) => (sameId(e.id, id) ? { ...e, ...patch } : e)));
      showToast('Caso abierto');
    } catch (err) {
      const s = err.response?.status;
      if (s === 409) showToast('Ya no está pendiente', false);
      else if (s === 403) showToast('No es de tu ciudad', false);
      else showToast(errorMessage(err, 'Error al abrir el caso'), false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async () => {
    if (!selected) return;
    if (!observacion.trim()) { showToast('La observación es obligatoria', false); return; }
    const id = selected.id;
    setActionLoading(id);
    try {
      const { data: updated } = await resolveWithObservation(id, observacion.trim());
      setSelected((prev) => ({
        ...prev,
        estado: updated.estado || 'resuelta',
        estadoLabel: updated.estadoLabel,
        observacion: updated.observacion,
        resueltoPor: updated.resueltoPor,
        resueltaAt: updated.resueltaAt,
        atendidaAt: updated.atendidaAt || prev.atendidaAt,
        administrador: updated.atendidoPor || prev.administrador,
      }));
      setEmergencies((prev) => prev.map((e) => (sameId(e.id, id) ? { ...e, estado: updated.estado || 'resuelta', observacion: updated.observacion } : e)));
      showToast('Caso resuelto');
      setObservacion('');
    } catch (err) {
      if (err.response?.status === 409) showToast('Ya fue resuelta', false);
      else showToast(errorMessage(err, 'Error al resolver'), false);
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    { key: 'estado', label: 'Estado', render: (v, r) => <StatusBadge status={v} label={r.estadoLabel} /> },
    { key: 'motivo', label: 'Motivo', render: (v) => <span className="em-truncate" title={v || ''}>{v || '—'}</span> },
    {
      key: 'usuario',
      label: 'Quién activó',
      render: (_, r) => (
        <div className="cell-user__text">
          <span className="cell-user__name">{r.usuario?.nombre || '—'}</span>
          {r.usuario?.telefono && <span className="cell-user__meta">{r.usuario.telefono}</span>}
        </div>
      ),
    },
    {
      key: 'viaje',
      label: 'Viaje',
      render: (_, r) => (
        <div className="cell-user__text">
          <span className="text-mono text-primary-color">#{String(r.viajeId || '').slice(0, 6)}</span>
          {(r.viaje?.estadoLabel || r.viaje?.estado) && <span className="cell-user__meta">{r.viaje.estadoLabel || r.viaje.estado}</span>}
        </div>
      ),
    },
    { key: 'cliente', label: 'Cliente', render: (_, r) => r.viaje?.cliente?.nombre?.trim() || '—' },
    { key: 'atendido', label: 'Atendido / resuelto por', render: (_, r) => r.administrador || r.resueltoPor || '—' },
    { key: 'createdAt', label: 'Fecha', render: (v) => <span className="nowrap text-muted">{formatDateTime(v)}</span> },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      render: (_, r) => (r.lat && r.lng ? (
        <a
          className="em-link"
          href={mapsUrl(r.lat, r.lng)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label="Ver ubicación en Google Maps"
        >
          <MapPin size={14} /> Mapa
        </a>
      ) : '—'),
    },
    {
      key: 'acciones',
      label: '',
      align: 'right',
      render: (_, r) => (
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(r); }} aria-label={`Ver caso ${String(r.id).slice(0, 8)}`}>
          Ver <ChevronRight size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Emergencias" description="Alertas SOS de viajes en tu ciudad. Atiende, conversa con el solicitante y cierra cada caso." />

      <div className="toolbar">
        <SegmentedFilter options={TABS} value={tab} onChange={setTab} ariaLabel="Estado de las emergencias" />
      </div>

      {error && <div className="page-error" role="alert">{error}</div>}

      <DataTable
        columns={columns}
        data={emergencies}
        loading={loading}
        emptyMessage={EMPTY_BY_TAB[tab]}
        onRowClick={openDetail}
        footer={totalPages > 1 ? <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} /> : null}
      />

      <EmergencyDetailModal
        selected={selected}
        tripDetail={tripDetail}
        onClose={closeDetail}
        chat={{
          mensajes,
          loading: mensajesLoading,
          error: mensajesError,
          onRetry: () => selected && loadMessages(selected.id),
          texto: nuevoTexto,
          onTextoChange: setNuevoTexto,
          onSend: enviarMensaje,
          sending: enviando,
        }}
        observacion={observacion}
        onObservacionChange={setObservacion}
        actionLoading={actionLoading}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
      />

      {toast && (
        <ToastContainer>
          <Toast message={toast.message} variant={toast.variant} onClose={closeToast} />
        </ToastContainer>
      )}
    </div>
  );
}
