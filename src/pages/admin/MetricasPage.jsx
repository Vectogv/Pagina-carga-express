import { useState, useEffect, useCallback } from 'react';
import { getMetricas } from '../../api/admin';
import { errorMessage } from '../../utils/format';
import { useZonas } from '../../hooks/useZonas';
import { PageHeader, Select, Input, Alert, LoadingState, StatCard, SegmentedFilter } from '../../components/ui';
import './MetricasPage.css';

const hoy = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const haceDias = (n) => new Date(Date.now() - 5 * 3600e3 - (n - 1) * 864e5).toISOString().slice(0, 10);
const num = (v) => (v ?? 0).toLocaleString('es-CO');
const money = (v) => `$${num(v)}`;
const pct = (v) => `${(v ?? 0).toLocaleString('es-CO')} %`;
const seg = (v) => (v == null ? '—' : v >= 60 ? `${(v / 60).toLocaleString('es-CO', { maximumFractionDigits: 1 })} min` : `${v} s`);

const RANGOS = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
  { value: 'x', label: 'Personalizado' },
];

function Grupo({ titulo, children }) {
  return (
    <section className="met__grupo">
      <h2 className="met__titulo">{titulo}</h2>
      <div className="met__grid">{children}</div>
    </section>
  );
}

export default function MetricasPage() {
  const zonas = useZonas();
  const [rango, setRango] = useState('30');
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoy());
  const [zona, setZona] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const elegir = (v) => {
    setRango(v);
    if (v !== 'x') { setDesde(haceDias(Number(v))); setHasta(hoy()); }
  };

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getMetricas({ desde, hasta, ...(zona ? { zona } : {}) });
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err, 'Error al cargar las métricas'));
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, zona]);

  useEffect(() => { cargar(); }, [cargar]);

  const v = data?.viajes, d = data?.dinero, o = data?.ofertas, p = data?.personas, c = data?.calidad;
  const max = Math.max(1, ...(data?.serieDiaria || []).map((x) => x.creados));

  return (
    <div className="met">
      <PageHeader title="Métricas" subtitle="Viajes creados en el rango (hora de Colombia), con su estado actual" />
      <div className="met__filtros">
        <SegmentedFilter options={RANGOS} value={rango} onChange={elegir} />
        {rango === 'x' && (
          <>
            <Input label="Desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
            <Input label="Hasta" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
          </>
        )}
        <Select label="Zona" value={zona} onChange={(e) => setZona(e.target.value)}>
          <option value="">Todas las zonas</option>
          {zonas.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {loading && !data && <LoadingState />}
      {data && (
        <div className={loading ? 'met__cargando' : undefined}>
          <Grupo titulo="Viajes">
            <StatCard title="Creados" value={num(v.creados)} />
            <StatCard title="Finalizados" value={num(v.finalizados)} subtitle={`Tasa ${pct(v.tasaFinalizacion)}`} />
            <StatCard title="Cancelados" value={num(v.cancelados)} subtitle={`Cliente ${num(v.canceladosPorCliente)} · Conductor ${num(v.canceladosPorConductor)} · Auto ${num(v.canceladosAutomaticos)}`} />
            <StatCard title="Vencidos sin conductor" value={num(v.vencidosSinConductor)} />
          </Grupo>
          <Grupo titulo="Dinero (viajes finalizados)">
            <StatCard title="Valor transportado" value={money(d.valorTransportado)} />
            <StatCard title="Comisión" value={money(d.comision)} />
            <StatCard title="Ayuda (sin comisión)" value={money(d.ayuda)} />
          </Grupo>
          <Grupo titulo="Ofertas">
            <StatCard title="Viajes con oferta" value={pct(o.porcentajeConOferta)} />
            <StatCard title="Primera oferta (mediana)" value={seg(o.medianaSegundosPrimeraOferta)} />
            <StatCard title="Ofertas por viaje (mediana)" value={o.medianaOfertasPorViaje == null ? '—' : num(o.medianaOfertasPorViaje)} />
          </Grupo>
          <Grupo titulo="Personas">
            <StatCard title="Clientes activos" value={num(p.clientesActivos)} subtitle={`Nuevos ${num(p.clientesNuevos)} · Recurrentes ${num(p.clientesRecurrentes)}`} />
            <StatCard title="Conductores activos" value={num(p.conductoresActivos)} />
            <StatCard title="Conductores conectados" value={num(p.conductoresConectados)} subtitle="Ahora" />
          </Grupo>
          <Grupo titulo="Calidad">
            <StatCard title="Calificación promedio" value={c.calificacionPromedio == null ? '—' : c.calificacionPromedio.toLocaleString('es-CO')} />
            <StatCard title="Disputas" value={num(c.disputas)} subtitle={`Abiertas ${num(c.disputasAbiertas)}`} />
            <StatCard title="SOS" value={num(c.sos)} />
          </Grupo>

          <section className="met__grupo">
            <h2 className="met__titulo">Viajes por día</h2>
            <div className="met__leyenda"><span className="met__dot met__dot--a" />Creados<span className="met__dot met__dot--b" />Finalizados</div>
            <div className="met__barras" role="img" aria-label="Viajes creados y finalizados por día">
              {data.serieDiaria.map((x) => (
                <div key={x.dia} className="met__col" title={`${x.dia}: ${x.creados} creados, ${x.finalizados} finalizados`}>
                  <div className="met__par">
                    <div className="met__bar met__bar--a" style={{ height: `${(x.creados / max) * 100}%` }} />
                    <div className="met__bar met__bar--b" style={{ height: `${(x.finalizados / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="met__ejes"><span>{data.serieDiaria[0]?.dia}</span><span>{data.serieDiaria.at(-1)?.dia}</span></div>
          </section>

          {!zona && (
            <section className="met__grupo">
              <h2 className="met__titulo">Zonas con más viajes</h2>
              <div className="met__tabla">
                <table>
                  <thead><tr><th>Zona</th><th>Viajes</th><th>Finalizados</th></tr></thead>
                  <tbody>
                    {data.topZonas.map((z) => (
                      <tr key={z.zona}><td>{z.nombre}</td><td>{num(z.viajes)}</td><td>{num(z.finalizados)}</td></tr>
                    ))}
                    {!data.topZonas.length && <tr><td colSpan="3">Sin viajes en el rango</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
