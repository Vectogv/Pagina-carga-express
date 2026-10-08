import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clienteApi } from '../../api/cliente';
import { descargarBlob, descargarCsv } from '../../utils/csv';
import { errorMessage, formatDate } from '../../utils/format';

const pesos = (v) => `$${Number(v || 0).toLocaleString('es-CO')}`;
const mesActual = () => new Date().toISOString().slice(0, 7);

function Tabla({ titulo, cols, filas, vacio }) {
  return (
    <div className="cli-card">
      <h2 className="cli-emp__h2">{titulo}</h2>
      {filas.length === 0 ? <p className="cli-cargando">{vacio}</p> : (
        <div className="cli-emp__scroll">
          <table className="cli-emp__tabla">
            <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Empresa() {
  const { user } = useAuth();
  const [mes, setMes] = useState(mesActual());
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [bajando, setBajando] = useState(false);

  useEffect(() => {
    if (!mes) return undefined;
    let vivo = true;
    setDatos(null);
    setError(null);
    clienteApi.empresaResumen(mes)
      .then((r) => { if (vivo) setDatos(r.data?.data || r.data); })
      .catch((e) => { if (vivo) setError(errorMessage(e, 'No se pudo cargar el resumen')); });
    return () => { vivo = false; };
  }, [mes]);

  if (!user?.empresa?.esDueno) return <Navigate to="/cliente" replace />;

  const pdf = async () => {
    setBajando(true);
    try {
      const r = await clienteApi.empresaReporte(mes);
      descargarBlob(r.data, `reporte-empresa-${mes}.pdf`);
    } catch (e) {
      setError(errorMessage(e, 'No se pudo descargar el PDF'));
    } finally {
      setBajando(false);
    }
  };

  const csv = () => descargarCsv(
    `viajes-empresa-${mes}.csv`,
    ['Viaje', 'Fecha', 'Solicitante', 'Origen', 'Destino', 'Conductor', 'Valor'],
    datos.detalle.map((d) => [d.id, formatDate(d.fecha), d.solicitante, d.origen, d.destino, d.conductor, d.valor]),
  );

  const porUsuario = datos?.porUsuario || [];
  const conductores = datos?.conductores || [];
  const detalle = datos?.detalle || [];

  return (
    <section>
      <div className="cli-titulo">
        <h1>{user.empresa.nombre}</h1>
        <span>Gastos de la empresa</span>
      </div>

      <div className="cli-emp__barra">
        <label>Mes <input type="month" value={mes} max={mesActual()} onChange={(e) => setMes(e.target.value)} /></label>
        <button type="button" className="cli-btn" onClick={pdf} disabled={bajando || !mes}>
          {bajando ? 'Descargando…' : 'Descargar PDF'}
        </button>
        <button type="button" className="cli-btn cli-btn--borde" onClick={csv} disabled={!detalle.length}>Exportar CSV</button>
      </div>

      {error && <p className="cli-error" role="alert">{error}</p>}
      {!datos && !error && <p className="cli-cargando">Cargando…</p>}

      {datos && (
        <div className="cli-emp">
          <div className="cli-emp__stats">
            <div className="cli-card"><small>Viajes</small><strong>{datos.viajes}</strong></div>
            <div className="cli-card"><small>Total</small><strong>{pesos(datos.total)}</strong></div>
          </div>
          <Tabla
            titulo="Por usuario"
            cols={['Usuario', 'Viajes', 'Total']}
            filas={porUsuario.map((u) => [u.nombre, u.viajes, pesos(u.total)])}
            vacio="Sin viajes este mes."
          />
          <Tabla
            titulo="Conductores más usados"
            cols={['Conductor', 'Calificación', 'Viajes']}
            filas={conductores.map((c) => [c.nombre, c.calificacion ?? '—', c.viajes])}
            vacio="Sin viajes este mes."
          />
          <Tabla
            titulo="Viajes"
            cols={['Fecha', 'Solicitante', 'Origen', 'Destino', 'Conductor', 'Valor']}
            filas={detalle.map((d) => [formatDate(d.fecha), d.solicitante, d.origen, d.destino, d.conductor, pesos(d.valor)])}
            vacio="Sin viajes este mes."
          />
        </div>
      )}
    </section>
  );
}
