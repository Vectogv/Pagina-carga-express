import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { clienteApi } from '../../api/cliente';
import { errorMessage } from '../../utils/format';
import { Encuadre, posicionDe } from '../../components/panel';
import { PINES } from '../../components/panel/pines';

const REFRESCO_MS = 20000;
const pesos = (v) => `$${Number(v || 0).toLocaleString('es-CO')}`;
const estadoTxt = (e) => String(e || '').replace(/_/g, ' ');
const cuerpo = (r) => r.data?.data || r.data;

function Equipo({ codigo, onCodigo, setError }) {
  const [miembros, setMiembros] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(() => clienteApi.empresaMiembros()
    .then((r) => setMiembros(cuerpo(r).miembros || []))
    .catch((e) => setError(errorMessage(e, 'No se pudo cargar el equipo'))), [setError]);
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

  return (
    <div className="cli-card">
      <h2 className="cli-emp__h2">Equipo</h2>
      {codigo && (
        <div className="cli-emp__barra">
          <span>Código de invitación: <strong>{codigo}</strong></span>
          <button type="button" className="cli-btn cli-btn--borde" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</button>
          <button type="button" className="cli-btn cli-btn--borde" onClick={nuevoCodigo} disabled={ocupado}>Generar código nuevo</button>
        </div>
      )}
      {!miembros ? <p className="cli-cargando">Cargando…</p> : (
        <div className="cli-emp__scroll">
          <table className="cli-emp__tabla">
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.id}>
                  <td>{m.nombre} {m.apellido}{m.esDueno ? ' (dueño)' : ''}</td>
                  <td>{m.telefono || '—'}</td>
                  <td>{m.estadoMiembro === 'pendiente' ? 'Pendiente' : 'Aprobado'}</td>
                  <td>
                    {m.estadoMiembro === 'pendiente' && !m.esDueno && (
                      <>
                        <button type="button" className="cli-btn cli-btn--suave" disabled={ocupado} onClick={() => decidir(m, true)}>Aprobar</button>{' '}
                        <button type="button" className="cli-btn cli-btn--borde" disabled={ocupado} onClick={() => decidir(m, false)}>Rechazar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ViajesActivos({ setError }) {
  const [viajes, setViajes] = useState(null);
  useEffect(() => {
    let vivo = true;
    const cargar = () => clienteApi.empresaViajesActivos()
      .then((r) => { if (vivo) setViajes(cuerpo(r).viajes || []); })
      .catch((e) => { if (vivo) setError(errorMessage(e, 'No se pudieron cargar los viajes en curso')); });
    cargar();
    const t = setInterval(cargar, REFRESCO_MS);
    return () => { vivo = false; clearInterval(t); };
  }, [setError]);

  const puntos = (viajes || []).flatMap((v) => [posicionDe(v.origen), posicionDe(v.conductor)]).filter(Boolean);
  return (
    <div className="cli-card">
      <h2 className="cli-emp__h2">Viajes en curso</h2>
      {!viajes ? <p className="cli-cargando">Cargando…</p> : viajes.length === 0 ? <p className="cli-cargando">No hay viajes en curso.</p> : (
        <>
          <div className="cli-emp__scroll">
            <table className="cli-emp__tabla">
              <thead><tr><th>Estado</th><th>Empleado</th><th>Origen → Destino</th><th>Conductor</th><th>Valor</th></tr></thead>
              <tbody>
                {viajes.map((v) => (
                  <tr key={v.id}>
                    <td>{estadoTxt(v.estado)}</td>
                    <td>{v.solicitante}</td>
                    <td>{v.origen?.direccion} → {v.destino?.direccion}</td>
                    <td>{v.conductor ? `${v.conductor.nombre} · ${v.conductor.placa || ''}` : 'Sin asignar'}</td>
                    <td>{pesos(v.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {puntos.length > 0 && (
            <div className="panel-mapa" style={{ height: 280, marginTop: 12 }}>
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
        </>
      )}
    </div>
  );
}

export default function EmpresaGestion() {
  const [codigo, setCodigo] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    clienteApi.empresa().then((r) => setCodigo(cuerpo(r).empresa?.codigo || null)).catch(() => {});
  }, []);
  return (
    <div className="cli-emp" style={{ marginBottom: 16 }}>
      {error && <p className="cli-error" role="alert">{error}</p>}
      <Equipo codigo={codigo} onCodigo={setCodigo} setError={setError} />
      <ViajesActivos setError={setError} />
    </div>
  );
}
