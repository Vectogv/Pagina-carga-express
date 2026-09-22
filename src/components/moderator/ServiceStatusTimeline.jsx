import { Check, Siren, TriangleAlert } from 'lucide-react';
import { flow, labels, special } from './serviceStatus';
import './ServiceStatusTimeline.css';

export default function ServiceStatusTimeline({ estado }) {
  const s = special[estado];
  if (s) {
    const isSos = estado === 'sos';
    return (
      <div className="sst-special">
        {isSos && (
          // Para SOS se muestra el recorrido hasta el último estado normal + indicador SOS.
          <div className="sst-special__trail">
            <span className="sst-special__trail-line" />
            <span>{labels.en_curso} → SOS activo</span>
            <span className="sst-special__trail-line sst-special__trail-line--danger" />
          </div>
        )}
        <div className={`sst-special__box sst-special__box--${s.tone}`} role={isSos ? 'alert' : undefined}>
          {isSos ? <Siren size={18} /> : <TriangleAlert size={18} />}
          <span>{s.label}</span>
        </div>
      </div>
    );
  }

  const activeIdx = flow.indexOf(estado);
  return (
    <div className="sst">
      <ol className="sst__track" aria-label="Progreso del servicio">
        {flow.map((key, i) => {
          const state = activeIdx > i ? 'done' : activeIdx === i ? 'current' : 'todo';
          return (
            <li key={key} className={`sst__step sst__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <div className="sst__node">
                <span className="sst__dot">{state === 'done' && <Check size={12} strokeWidth={3} />}</span>
                <span className="sst__label">{labels[key]}</span>
              </div>
              {i < flow.length - 1 && <span className="sst__line" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
