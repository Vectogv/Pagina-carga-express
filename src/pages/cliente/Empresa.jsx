import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BadgeCheck, Clock, Download, FileSpreadsheet, Package, Store, Truck, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clienteApi } from '../../api/cliente';
import { descargarBlob, descargarCsv } from '../../utils/csv';
import Marca from '../../components/Marca/Marca';
import { Equipo, ViajesActivos } from './EmpresaGestion';
import { errorMessage, formatDate } from '../../utils/format';

const pesos = (v) => `$${Number(v || 0).toLocaleString('es-CO')}`;
const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const mesTexto = (mes) => {
  const [a, m] = String(mes || '').split('-').map(Number);
  if (!a || !m) return '';
  const t = new Date(a, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return t[0].toUpperCase() + t.slice(1);
};

function Tabla({ titulo, cols, filas, vacio, num = [] }) {
  return (
    <div className="cli-card">
      <h2 className="cli-emp__h2">{titulo}</h2>
      {filas.length === 0 ? <p className="cli-cargando">{vacio}</p> : (
        <div className="cli-emp__scroll">
          <table className="cli-emp__tabla">
            <thead><tr>{cols.map((c, j) => <th key={c} className={num.includes(j) ? 'cli-emp__num' : ''}>{c}</th>)}</tr></thead>
            <tbody>{filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j} className={num.includes(j) ? 'cli-emp__num' : ''}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Gasto por usuario del mes como barras de proporción (sobre el mayor). */
function PorUsuario({ filas, total }) {
  const mayor = Math.max(...filas.map((u) => Number(u.total) || 0), 1);
  return (
    <div className="cli-card">
      <h2 className="cli-emp__h2">Por usuario</h2>
      {filas.length === 0 ? <p className="cli-cargando">Sin viajes este mes.</p> : (
        <ul className="cli-emp__barras">
          {filas.map((u) => {
            const v = Number(u.total) || 0;
            return (
              <li key={u.nombre}>
                <div className="cli-emp__barra-cab">
                  <strong>{u.nombre}</strong>
                  <span>{u.viajes} {u.viajes === 1 ? 'viaje' : 'viajes'} · <b>{pesos(v)}</b>{total > 0 && <small> ({Math.round((v / total) * 100)} %)</small>}</span>
                </div>
                <div className="cli-emp__barra-pista"><span style={{ width: `${Math.max(2, (v / mayor) * 100)}%` }} /></div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Kpi({ icono: Icono, etiqueta, valor, tono = '' }) {
  return (
    <div className={`cli-card cli-emp__kpi ${tono}`}>
      <span className="cli-emp__kpi-icono"><Icono size={22} /></span>
      <small>{etiqueta}</small>
      <strong>{valor ?? '—'}</strong>
    </div>
  );
}

export default function Empresa() {
  const { user } = useAuth();
  const [mes, setMes] = useState(mesActual());
  const [datos, setDatos] = useState(null);
  const [empresa, setEmpresa] = useState(null); // de /empresas/mia: trae nit y código
  const [codigo, setCodigo] = useState(null);
  const [enCurso, setEnCurso] = useState(null);
  const [miembros, setMiembros] = useState(null);
  const [error, setError] = useState(null);
  const [bajando, setBajando] = useState(false);
  const esDueno = !!user?.empresa?.esDueno;
  const enRevision = user?.empresa?.estado === 'pendiente';

  useEffect(() => {
    if (!esDueno) return;
    clienteApi.empresa().then((r) => {
      const e = (r.data?.data || r.data)?.empresa;
      setEmpresa(e || null);
      setCodigo(e?.codigo || null);
    }).catch(() => {});
  }, [esDueno]);

  useEffect(() => {
    if (!mes || !esDueno || enRevision) return undefined; // sin empresa propia no se consulta (403) y se redirige abajo
    let vivo = true;
    setDatos(null);
    setError(null);
    clienteApi.empresaResumen(mes)
      .then((r) => { if (vivo) setDatos(r.data?.data || r.data); })
      .catch((e) => { if (vivo) setError(errorMessage(e, 'No se pudo cargar el resumen')); });
    return () => { vivo = false; };
  }, [mes, esDueno, enRevision]);

  const onViajes = useCallback((n) => setEnCurso(n), []);
  const onMiembros = useCallback((n) => setMiembros(n), []);

  if (!esDueno) return <Navigate to="/cliente" replace />;

  const emprendimiento = empresa && !empresa.nit;
  const insignia = enRevision
    ? { clase: 'cli-badge--warning', icono: Clock, texto: 'En revisión' }
    : emprendimiento
      ? { clase: 'cli-badge--success', icono: Store, texto: 'Emprendimiento verificado' }
      : { clase: 'cli-badge--success', icono: BadgeCheck, texto: 'Empresa verificada' };

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

  const hero = (
    <header className="cli-emp__hero">
      <div className="cli-emp__hero-marca"><Marca oscura /><span>Portal de empresa</span></div>
      <div className="cli-emp__hero-cuerpo">
        <div>
          <h1>{user.empresa.nombre}</h1>
          <div className="cli-emp__hero-meta">
            <span className={`cli-badge ${insignia.clase}`}><insignia.icono size={14} />{insignia.texto}</span>
            {empresa?.nit && <span className="cli-emp__nit">NIT {empresa.nit}</span>}
            {emprendimiento && <span className="cli-emp__nit">Sin NIT</span>}
          </div>
        </div>
        {!enRevision && (
          <div className="cli-emp__hero-acciones">
            <label className="cli-emp__mes">
              <span>Mes</span>
              <input type="month" value={mes} max={mesActual()} onChange={(e) => setMes(e.target.value)} />
            </label>
            <button type="button" className="cli-btn" onClick={pdf} disabled={bajando || !mes}>
              <Download size={16} />{bajando ? 'Descargando…' : 'Descargar PDF'}
            </button>
            <button type="button" className="cli-btn cli-btn--borde cli-emp__btn-claro" onClick={csv} disabled={!detalle.length}>
              <FileSpreadsheet size={16} />Exportar CSV
            </button>
          </div>
        )}
      </div>
    </header>
  );

  if (enRevision) {
    return (
      <section className="cli-emp">
        {hero}
        <div className="cli-vacio" role="status">
          <span className="cli-vacio__icono"><Clock size={34} /></span>
          <strong>Tu empresa está en revisión</strong>
          <p>Gerencia está verificando los documentos. Te avisamos cuando la apruebe y aquí verás tu equipo, la operación en vivo y los gastos.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="cli-emp">
      {hero}

      <div className="cli-emp__kpis" aria-label={`Resumen de ${mesTexto(mes)}`}>
        <Kpi icono={Package} etiqueta={`Viajes · ${mesTexto(mes)}`} valor={datos ? datos.viajes : null} />
        <Kpi icono={Wallet} etiqueta="Total gastado" valor={datos ? pesos(datos.total) : null} tono="cli-emp__kpi--naranja" />
        <Kpi icono={Truck} etiqueta="Viajes en curso" valor={enCurso} tono={enCurso ? 'cli-emp__kpi--vivo' : ''} />
        <Kpi icono={Users} etiqueta="Miembros del equipo" valor={miembros} />
      </div>

      {error && <p className="cli-error" role="alert">{error}</p>}

      <ViajesActivos onViajes={onViajes} setError={setError} />
      <Equipo codigo={codigo} onCodigo={setCodigo} onMiembros={onMiembros} setError={setError} />

      <div className="cli-emp__cab cli-emp__cab--seccion">
        <h2 className="cli-emp__h2">Gastos de {mesTexto(mes)}</h2>
      </div>
      {!datos && !error && <p className="cli-cargando">Cargando…</p>}
      {datos && (
        <>
          <div className="cli-emp__dos">
            <PorUsuario filas={porUsuario} total={Number(datos.total) || 0} />
            <Tabla
              titulo="Conductores más usados"
              cols={['Conductor', 'Calificación', 'Viajes']}
              num={[1, 2]}
              filas={conductores.map((c) => [c.nombre, c.calificacion ?? '—', c.viajes])}
              vacio="Sin viajes este mes."
            />
          </div>
          <Tabla
            titulo="Viajes"
            cols={['Fecha', 'Solicitante', 'Origen', 'Destino', 'Conductor', 'Valor']}
            num={[5]}
            filas={detalle.map((d) => [formatDate(d.fecha), d.solicitante, d.origen, d.destino, d.conductor, pesos(d.valor)])}
            vacio="Sin viajes este mes."
          />
        </>
      )}
    </section>
  );
}
