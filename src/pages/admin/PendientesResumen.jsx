import { useNavigate } from 'react-router-dom';
import { Siren, Scale, Clock, XCircle, Wallet, LifeBuoy, Flag, UserCheck, ShieldCheck, FileWarning, Megaphone, Check, PartyPopper, ChevronRight } from 'lucide-react';
import { formatDate } from '../../utils/format';
import { zonaLabelFrom } from '../../hooks/useZonas';
import { EmptyState } from '../../components/ui';
import './PendientesPage.css';

// Orden = prioridad. sev: danger (urgente), warning, info. to: pantalla donde se resuelve.
const CATEGORIAS = {
  emergencias: { icon: Siren, sev: 'danger', to: '/admin/emergencies' },
  disputas: { icon: Scale, sev: 'danger', to: '/admin/disputes' },
  cierres: { icon: Clock, sev: 'warning', to: '/admin/trips' },
  cancelaciones: { icon: XCircle, sev: 'warning', to: '/admin/cancellation-requests' },
  pagos: { icon: Wallet, sev: 'warning', to: '/admin/payments' },
  tickets: { icon: LifeBuoy, sev: 'warning', to: '/admin/tickets' },
  reportes: { icon: Flag, sev: 'warning', to: '/admin/reports' },
  verificaciones: { icon: UserCheck, sev: 'info', to: '/admin/verifications' },
  moderadores: { icon: ShieldCheck, sev: 'info', to: '/admin/moderadores-verificaciones' },
  soat: { icon: FileWarning, sev: 'info', to: '/admin/verifications' },
  comunicados: { icon: Megaphone, sev: 'info', to: '/admin/comunicados' },
};
const ORDEN = Object.keys(CATEGORIAS);
const prioridad = (clave) => { const i = ORDEN.indexOf(clave); return i < 0 ? ORDEN.length : i; };

// Resumen de GET /api/admin/pendientes: alerta de SOS, "Requiere atención" y "Al día". Lo usan Pendientes y el Inicio.
export default function PendientesResumen({ categorias, zonas }) {
  const navigate = useNavigate();
  const todas = [...(categorias || [])].sort((a, b) => prioridad(a.clave) - prioridad(b.clave));
  const activas = todas.filter((c) => c.total > 0);
  const alDia = todas.filter((c) => c.total === 0);
  const sos = todas.find((c) => c.clave === 'emergencias')?.total || 0;
  const ir = (c) => navigate(CATEGORIAS[c.clave]?.to || '/admin');

  return (
    <>
      {sos > 0 && (
        <button type="button" className="pend__sos" onClick={() => navigate(CATEGORIAS.emergencias.to)}>
          <Siren size={20} />
          <span>{sos === 1 ? '1 emergencia activa' : `${sos} emergencias activas`}</span>
          <strong>Atender <ChevronRight size={16} /></strong>
        </button>
      )}

      {activas.length === 0 ? (
        <EmptyState icon={<PartyPopper size={22} />} title="Todo al día" description="No hay nada pendiente por revisar." />
      ) : (
        <>
          <h2 className="pend__titulo">Requiere atención</h2>
          <div className="pend__grid">
            {activas.map((c) => {
              const { icon: Icon, sev } = CATEGORIAS[c.clave] || { icon: Flag, sev: 'info' };
              return (
                <article key={c.clave} className={`pend__card pend__card--${sev}`}>
                  <button type="button" className="pend__head" onClick={() => ir(c)}>
                    <span className="pend__icon"><Icon size={18} /></span>
                    <span className="pend__nombre">{c.titulo}</span>
                    <span className="pend__num">{c.total}</span>
                  </button>
                  <div className="pend__zonas">
                    {Object.entries(c.porZona).map(([z, n]) => (
                      <span key={z} className="pend__zona"><strong>{n}</strong> {z === 'sin_zona' ? 'Sin zona' : zonaLabelFrom(zonas, z)}</span>
                    ))}
                  </div>
                  <ul className="pend__items">
                    {c.items.map((i) => (
                      <li key={`${c.clave}-${i.id}`}>
                        <span className="pend__item-t">{i.titulo}</span>
                        <span className="pend__item-f">{i.createdAt ? formatDate(i.createdAt) : ''}</span>
                      </li>
                    ))}
                  </ul>
                  {c.total > c.items.length && <span className="pend__mas">y {c.total - c.items.length} más</span>}
                  <button type="button" className="pend__abrir" onClick={() => ir(c)}>Abrir <ChevronRight size={14} /></button>
                </article>
              );
            })}
          </div>
        </>
      )}

      {alDia.length > 0 && activas.length > 0 && (
        <>
          <h2 className="pend__titulo">Al día</h2>
          <div className="pend__chips">
            {alDia.map((c) => <span key={c.clave} className="pend__chip"><Check size={13} /> {c.titulo}</span>)}
          </div>
        </>
      )}
    </>
  );
}
