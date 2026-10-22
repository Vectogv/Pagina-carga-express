import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, ChevronDown, ChevronUp, Copy, KeyRound, RefreshCw, Truck, X } from 'lucide-react';
import { Avatar } from '../../components/ui';
import { clienteApi } from '../../api/cliente';
import { errorMessage } from '../../utils/format';
import { Encuadre, posicionDe } from '../../components/panel';
import { PINES } from '../../components/panel/pines';

const REFRESCO_MS = 20000;
const pesos = (v) => `$${Number(v || 0).toLocaleString('es-CO')}`;
const estadoTxt = (e) => String(e || '').replace(/_/g, ' ');
const cuerpo = (r) => r.data?.data || r.data;
const viajesTxt = (n) => `${n || 0} ${n === 1 ? 'viaje' : 'viajes'}`;

/** Equipo: tarjeta de acceso (código de invitación) + miembros con su estado. */
export function Equipo({ codigo, onCodigo, onMiembros, setError }) {
  const [miembros, setMiembros] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [abiertoId, setAbiertoId] = useState(null);

  const cargar = useCallback(() => clienteApi.empresaMiembros()
    .then((r) => { const m = cuerpo(r).miembros || []; setMiembros(m); onMiembros?.(m.length); })
    .catch((e) => setError(errorMessage(e, 'No se pudo cargar el equipo'))), [setError, onMiembros]);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (fn) => {
    setOcupado(true);
    setError(null);
    try { await fn(); } catch (e) { setError(errorMessage(e, 'No se pudo completar la acción')); }
    setOcupado(false);
  };
  const decidir = (m, aprobar) => {
    if (!aprobar && !window.confirm(`¿Rechazar a ${m.nombre}? Saldrá de la empresa.`)) return;
    accion(async () => {
      await (aprobar ? clienteApi.empresaAprobar(m.id) : clienteApi.empresaRechazar(m.id));
      await cargar();
    });
  };
  const nuevoCodigo = () => {
    if (!window.confirm('El código anterior dejará de servir. ¿Generar uno nuevo?')) return;
    accion(async () => { onCodigo(cuerpo(await clienteApi.empresaCodigoNuevo()).codigo); });
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* sin permiso de portapapeles */ }
  };

  const pendientes = (miembros || []).filter((m) => m.estadoMiembro === 'pendiente' && !m.esDueno).length;
  return (
    <div className="cli-card">
      <div className="cli-emp__cab">
        <h2 className="cli-emp__h2">Equipo</h2>
        {pendientes > 0 && <span className="cli-badge cli-badge--warning">{pendientes} por aprobar</span>}
      </div>
      {codigo && (
        <div className="cli-emp__codigo">
          <span className="cli-emp__codigo-icono"><KeyRound size={22} /></span>
          <div className="cli-emp__codigo-dato">
            <small>Código de invitación</small>
            <strong>{codigo}</strong>
            <p>Compártelo con tu equipo: con él se unen a la empresa desde la app.</p>
          </div>
          <div className="cli-emp__codigo-acciones">
            <button type="button" className="cli-btn cli-btn--borde" onClick={copiar}>{copiado ? <Check size={16} /> : <Copy size={16} />}{copiado ? 'Copiado' : 'Copiar'}</button>
            <button type="button" className="cli-btn cli-btn--borde" onClick={nuevoCodigo} disabled={ocupado}><RefreshCw size={16} />Generar nuevo</button>
          </div>
        </div>
      )}
      {!miembros ? <p className="cli-cargando">Cargando…</p> : (
        <ul className="cli-emp__miembros">
          {miembros.map((m) => {
            const pendiente = m.estadoMiembro === 'pendiente';
            const nombre = `${m.nombre} ${m.apellido || ''}`.trim();
            const abierto = abiertoId === m.id;
            return (
              <li key={m.id}>
                <Avatar src={m.avatar} name={nombre} size={46} />
                <div className="cli-emp__miembro-dato">
                  <strong>{nombre}</strong>
                  <small>Este mes: {viajesTxt(m.viajesMes)} · {pesos(m.gastoMes)}</small>
                </div>
                <span className={`cli-badge ${m.esDueno ? 'cli-badge--info' : pendiente ? 'cli-badge--warning' : 'cli-badge--success'}`}>
                  {m.esDueno ? 'Dueño' : pendiente ? 'Pendiente' : 'Aprobado'}
                </span>
                <button type="button" className="cli-btn cli-btn--borde" aria-expanded={abierto} onClick={() => setAbiertoId(abierto ? null : m.id)}>
                  {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}{abierto ? 'Ocultar' : 'Ver ficha'}
                </button>
                {abierto && (
                  <dl className="cli-emp__ficha">
                    <div><dt>Teléfono</dt><dd>{m.telefono || 'Sin teléfono'}</dd></div>
                    <div><dt>Correo</dt><dd>{m.email || '—'}</dd></div>
                    <div><dt>Cédula</dt><dd>{m.cedula || 'Sin registrar'}</dd></div>
                    <div><dt>Este mes</dt><dd>{viajesTxt(m.viajesMes)} · {pesos(m.gastoMes)}</dd></div>
                    <div><dt>En total</dt><dd>{viajesTxt(m.viajesTotal)} · {pesos(m.gastoTotal)}</dd></div>
                    <div><dt>Último viaje</dt><dd>{m.ultimoViajeAt ? new Date(m.ultimoViajeAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Ninguno'}</dd></div>
                    <div><dt>En curso</dt><dd>{m.enCurso ? viajesTxt(m.enCurso) : 'Ninguno'}</dd></div>
                  </dl>
                )}
                {pendiente && !m.esDueno && (
                  <div className="cli-emp__miembro-acciones">
                    <button type="button" className="cli-btn cli-btn--suave" disabled={ocupado} onClick={() => decidir(m, true)}><Check size={16} />Aprobar</button>
                    <button type="button" className="cli-btn cli-btn--borde" disabled={ocupado} onClick={() => decidir(m, false)}><X size={16} />Rechazar</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Operación en vivo: viajes en curso de la empresa, con mapa (refresca cada 20 s). */
export function ViajesActivos({ onViajes, setError }) {
  const [viajes, setViajes] = useState(null);
  useEffect(() => {
    let vivo = true;
    const cargar = () => clienteApi.empresaViajesActivos()
      .then((r) => { if (!vivo) return; const v = cuerpo(r).viajes || []; setViajes(v); onViajes?.(v.length); })
      .catch((e) => { if (vivo) setError(errorMessage(e, 'No se pudieron cargar los viajes en curso')); });
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => { vivo = false; clearInterval(t); };
  }, [setError, onViajes]);

  const puntos = (viajes || []).flatMap((v) => [posicionDe(v.origen), posicionDe(v.conductor)]).filter(Boolean);
  return (
    <div className="cli-card">
      <div className="cli-emp__cab">
        <h2 className="cli-emp__h2">Operación en vivo</h2>
        <span className={`cli-vivo ${viajes?.length ? 'cli-vivo--on' : ''}`}>{viajes?.length ? `${viajes.length} en curso` : 'Sin viajes'}</span>
      </div>
      {!viajes ? <p className="cli-cargando">Cargando…</p> : viajes.length === 0 ? (
        <div className="cli-vacio cli-vacio--chico">
          <span className="cli-vacio__icono"><Truck size={34} /></span>
          <strong>Ningún viaje en curso</strong>
          <p>Cuando tu equipo publique un envío desde la app Carga Express, lo verás aquí en vivo, con su conductor en el mapa.</p>
        </div>
      ) : (
        <>
          {puntos.length > 0 && (
            <div className="panel-mapa cli-emp__mapa">
              <MapContainer center={puntos[0]} zoom={13} scrollWheelZoom>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="&copy; OpenStreetMap" />
                <Encuadre puntos={puntos} />
                {viajes.flatMap((v) => {
                  const o = posicionDe(v.origen);
                  const c = posicionDe(v.conductor);
                  return [
                    o && <Marker key={`o${v.id}`} position={o} icon={PINES.A}><Popup>Viaje #{v.id}: origen</Popup></Marker>,
                    c && <Marker key={`c${v.id}`} position={c} icon={PINES.conductor}><Popup>{v.conductor.nombre}</Popup></Marker>,
                  ];
                })}
              </MapContainer>
            </div>
          )}
          <div className="cli-emp__scroll">
            <table className="cli-emp__tabla">
              <thead><tr><th>Estado</th><th>Empleado</th><th>Origen → Destino</th><th>Conductor</th><th>Valor</th></tr></thead>
              <tbody>
                {viajes.map((v) => (
                  <tr key={v.id}>
                    <td><span className="cli-badge cli-badge--info">{estadoTxt(v.estado)}</span></td>
                    <td>{v.solicitante}</td>
                    <td>{v.origen?.direccion} → {v.destino?.direccion}</td>
                    <td>{v.conductor ? `${v.conductor.nombre} · ${v.conductor.placa || ''}` : 'Sin asignar'}</td>
                    <td className="cli-emp__num">{pesos(v.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
