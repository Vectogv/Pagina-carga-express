import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Truck, MapPin, Flag, Phone, Star, KeyRound, LifeBuoy, LogOut, Package, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clienteApi } from '../../api/cliente';
import { statusLabel, statusVariant } from '../../components/ui/Badge/status';
import { errorMessage, formatCurrency, formatDateTime, fullName } from '../../utils/format';
import useSondeo from '../../hooks/useSondeo';
import { ClienteSocketProvider, useClienteSocket, useEventos } from '../../contexts/ClienteSocketContext';
import MapaViaje from './MapaViaje';
import './ClientePage.css';

export const Estado = ({ estado }) => (
  <span className={`cli-badge cli-badge--${statusVariant(estado)}`}>{statusLabel(estado)}</span>
);

export default function ClienteLayout() {
  return <ClienteSocketProvider><Marco /></ClienteSocketProvider>;
}

function Marco() {
  const { user, logout } = useAuth();
  const { conectado } = useClienteSocket();
  const navigate = useNavigate();
  const salir = async () => { await logout(); navigate('/ingresar', { replace: true }); };

  return (
    <div className="cli">
      <header className="cli__top">
        <Link to="/" className="cli__marca"><img src="/logo.png" alt="" width="44" height="44" className="cli__logo" />Carga Express</Link>
        <nav className="cli__nav">
          <NavLink to="/cliente" end>Mi viaje</NavLink>
          <NavLink to="/cliente/viajes">Mis viajes</NavLink>
          <NavLink to="/cliente/soporte">Soporte</NavLink>
        </nav>
        <div className="cli__usuario">
          <em className={`cli-vivo ${conectado ? 'cli-vivo--on' : ''}`} title={conectado ? 'Conectado en tiempo real' : 'Reconectando…'}>
            {conectado ? 'En vivo' : 'Reconectando'}
          </em>
          <span>{fullName(user)}</span>
          <button type="button" onClick={salir} aria-label="Cerrar sesión"><LogOut size={18} /><span>Salir</span></button>
        </div>
      </header>
      <main className="cli__main"><Outlet /></main>
    </div>
  );
}

// Avance del viaje: cada estado del backend cae en uno de estos pasos.
const PASOS = ['Buscando conductor', 'Conductor asignado', 'En camino a recoger', 'En el origen', 'En ruta', 'Entregado'];
const PASO_DE = {
  creado: 0, buscando_conductor: 0, reservado: 0, aceptado: 1, conductor_en_camino: 2,
  conductor_llegada: 3, en_curso: 4, sos: 4, entregado: 5, esperando_confirmacion: 5, pendiente_confirmacion: 5,
};

const precioDe = (v) => v.precioFinal ?? v.precioEstimado;

function Ruta({ viaje }) {
  return (
    <ol className="cli-ruta">
      <li><MapPin size={16} /><span><small>Origen</small>{viaje.origen?.direccion || '—'}</span></li>
      <li><Flag size={16} /><span><small>Destino</small>{viaje.destino?.direccion || '—'}</span></li>
    </ol>
  );
}

function Conductor({ c }) {
  if (!c) return null;
  return (
    <div className="cli-conductor">
      <span className="cli-conductor__avatar"><Truck size={20} /></span>
      <div>
        <strong>{c.nombre || 'Conductor'}</strong>
        <span>{[c.tipoVehiculo, c.placa].filter(Boolean).join(' · ')}</span>
        {Number(c.calificacion) > 0 && <span><Star size={13} /> {Number(c.calificacion).toFixed(1)}</span>}
      </div>
      {c.telefono && <a className="cli-btn cli-btn--suave" href={`tel:${c.telefono}`}><Phone size={16} />Llamar</a>}
    </div>
  );
}

const ayuda = (navigate, v) =>
  navigate('/cliente/soporte', { state: { viajeId: v.id, asunto: `Viaje #${v.id}` } });

export function ViajeActivo() {
  const navigate = useNavigate();
  const [viaje, setViaje] = useState(undefined);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    clienteApi.viajeActivo()
      .then(({ data }) => { setViaje(data); setError(''); })
      .catch((err) => {
        if (err?.response?.status === 404) { setViaje(null); setError(''); }
        else setError(errorMessage(err, 'No se pudo cargar tu viaje.'));
      });
  }, []);
  // El socket avisa al instante; el sondeo solo cubre si la conexión se cae.
  useSondeo(cargar, 30000);

  // Ruta + posición del conductor: se pide al cambiar de fase y luego llega por socket.
  const [ruta, setRuta] = useState(null);
  const viajeId = viaje?.id;
  const estado = viaje?.estado;
  const conConductor = Boolean(viaje?.conductor);
  useEffect(() => {
    if (!viajeId || !conConductor) return undefined;
    let vigente = true;
    clienteApi.ruta(viajeId)
      .then(({ data }) => { if (vigente) setRuta(data); })
      .catch(() => { if (vigente) setRuta(null); });
    return () => { vigente = false; };
  }, [viajeId, estado, conConductor]);

  const actualizarRuta = (p) => {
    if (p?.tripId && String(p.tripId) !== String(viajeId)) return;
    setRuta((r) => ({ ...r, ...p, coords: p.coords ?? r?.coords }));
  };
  useEventos({
    connect: cargar,
    'trip:status_changed': cargar,
    'driver:location': (p) => setRuta((r) => ({ ...r, conductor: { lat: p.lat, lng: p.lng } })),
    'trip:route_update': actualizarRuta,
    'trip:eta_update': actualizarRuta,
  });

  if (viaje === undefined && !error) return <p className="cli-cargando">Cargando tu viaje…</p>;
  if (error && !viaje) return <p className="cli-error" role="alert">{error}</p>;
  if (!viaje) {
    return (
      <section className="cli-vacio">
        <Package size={28} />
        <h1>No tienes un viaje en curso</h1>
        <p>Cuando publiques un envío desde la app Carga Express, aquí verás su estado en tiempo real.</p>
        <Link to="/cliente/viajes" className="cli-btn">Ver mis viajes</Link>
      </section>
    );
  }

  const paso = PASO_DE[viaje.estado] ?? -1;
  const precio = precioDe(viaje);

  return (
    <section className="cli-activo">
      <div className="cli-activo__cabeza">
        <div>
          <small>Viaje #{viaje.id}</small>
          <h1>{statusLabel(viaje.estado)}</h1>
          {viaje.estado === 'reservado' && viaje.fechaProgramada && (
            <p>Programado para el {viaje.fechaProgramada}{viaje.horaProgramada ? ` a las ${viaje.horaProgramada}` : ''}</p>
          )}
        </div>
        <Estado estado={viaje.estado} />
      </div>
      {error && <p className="cli-error" role="alert">{error} Mostrando la última información.</p>}

      {paso >= 0 && (
        <ol className="cli-pasos" aria-label="Avance del viaje">
          {PASOS.map((p, i) => (
            <li key={p} className={i < paso ? 'hecho' : i === paso ? 'actual' : ''}>{p}</li>
          ))}
        </ol>
      )}

      <div className="cli-card cli-card--mapa">
        {conConductor && ruta?.minutos != null && (
          <p className="cli-eta">
            <span className="cli-vivo cli-vivo--on">En vivo</span>
            {viaje.estado === 'en_curso' ? 'Llega al destino en ' : 'El conductor llega a recoger en '}
            <strong>{Math.max(1, Math.round(ruta.minutos))} min</strong>
            {ruta.restanteM != null && <> · {(ruta.restanteM / 1000).toFixed(1).replace('.', ',')} km</>}
          </p>
        )}
        <MapaViaje viaje={viaje} conductor={conConductor ? ruta?.conductor : null} ruta={conConductor ? ruta?.coords : null} />
      </div>

      <div className="cli-activo__grid">
        <div className="cli-card">
          <h2>Ruta</h2>
          <Ruta viaje={viaje} />
          <dl className="cli-datos">
            {viaje.carga && <div><dt>Carga</dt><dd>{viaje.carga}</dd></div>}
            {precio != null && <div><dt>Precio</dt><dd>{formatCurrency(precio)}</dd></div>}
            {viaje.tiempoEstimadoMinutos && <div><dt>Tiempo estimado</dt><dd>{viaje.tiempoEstimadoMinutos} min</dd></div>}
            <div><dt>Solicitado</dt><dd>{formatDateTime(viaje.createdAt)}</dd></div>
          </dl>
        </div>

        <div className="cli-columna">
          {viaje.pinEntrega && (
            <div className="cli-card cli-pin">
              <h2><KeyRound size={18} />PIN de entrega</h2>
              <strong>{String(viaje.pinEntrega).split('').join(' ')}</strong>
              <p>Dáselo solo a quien reciba la carga. Sin este PIN el conductor no puede cerrar el viaje.</p>
            </div>
          )}
          <div className="cli-card">
            <h2>Conductor</h2>
            {viaje.conductor ? <Conductor c={viaje.conductor} /> : <p className="cli-suave">Aún no hay conductor asignado.</p>}
          </div>
          <button type="button" className="cli-btn cli-btn--borde" onClick={() => ayuda(navigate, viaje)}>
            <LifeBuoy size={18} />¿Un problema con este viaje? Escribe a soporte
          </button>
        </div>
      </div>
    </section>
  );
}

const LIMITE = 10;

export function MisViajes() {
  const navigate = useNavigate();
  const [pagina, setPagina] = useState(1);
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  // Sube cuando un viaje cambia de estado, para recargar la página actual.
  const [cambios, setCambios] = useState(0);
  const recargar = () => setCambios((n) => n + 1);
  useEventos({ connect: recargar, 'trip:status_changed': recargar });

  useEffect(() => {
    let vigente = true;
    clienteApi.historial(pagina, LIMITE)
      .then(({ data }) => { if (vigente) { setRes(data); setError(''); } })
      .catch((err) => { if (vigente) setError(errorMessage(err, 'No se pudieron cargar tus viajes.')); });
    return () => { vigente = false; };
  }, [pagina, cambios]);

  if (error) return <p className="cli-error" role="alert">{error}</p>;
  if (!res) return <p className="cli-cargando">Cargando tus viajes…</p>;

  const viajes = res.data || [];
  const paginas = Math.max(1, Math.ceil((res.total || 0) / LIMITE));

  return (
    <section>
      <div className="cli-titulo">
        <h1>Mis viajes</h1>
        <span>{res.total || 0} en total</span>
      </div>

      {viajes.length === 0 ? (
        <div className="cli-vacio">
          <Package size={28} />
          <h1>Todavía no tienes viajes</h1>
          <p>Tus envíos aparecerán aquí cuando los publiques desde la app.</p>
        </div>
      ) : (
        <ul className="cli-lista">
          {viajes.map((v) => (
            <li key={v.id}>
              <details className="cli-card cli-viaje">
                <summary>
                  <div className="cli-viaje__info">
                    <small>#{v.id} · {formatDateTime(v.createdAt)}</small>
                    <strong>{v.origen?.direccion || '—'}</strong>
                    <span>→ {v.destino?.direccion || '—'}</span>
                  </div>
                  <div className="cli-viaje__lado">
                    <Estado estado={v.estado} />
                    {precioDe(v) != null && <b>{formatCurrency(precioDe(v))}</b>}
                  </div>
                  <ChevronDown size={18} className="cli-viaje__flecha" />
                </summary>
                <div className="cli-viaje__detalle">
                  <dl className="cli-datos">
                    {v.carga && <div><dt>Carga</dt><dd>{v.carga}</dd></div>}
                    {v.conductor && <div><dt>Conductor</dt><dd>{v.conductor.nombre}{v.conductor.placa ? ` · ${v.conductor.placa}` : ''}</dd></div>}
                    {(v.finalizadoAt || v.completadoAt) && <div><dt>Entregado</dt><dd>{formatDateTime(v.finalizadoAt || v.completadoAt)}</dd></div>}
                    {v.canceladoAt && <div><dt>Cancelado</dt><dd>{formatDateTime(v.canceladoAt)}{v.motivoCancelacion ? ` · ${v.motivoCancelacion}` : ''}</dd></div>}
                  </dl>
                  <button type="button" className="cli-btn cli-btn--borde" onClick={() => ayuda(navigate, v)}>
                    <LifeBuoy size={16} />Pedir ayuda con este viaje
                  </button>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="cli-paginas" aria-label="Páginas">
          <button type="button" className="cli-btn cli-btn--borde" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span>Página {pagina} de {paginas}</span>
          <button type="button" className="cli-btn cli-btn--borde" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
        </nav>
      )}
    </section>
  );
}
