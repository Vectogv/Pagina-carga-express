const flow = [
  'creado',
  'buscando_conductor',
  'pendiente',
  'aceptado',
  'conductor_en_camino',
  'conductor_llegada',
  'en_curso',
  'entregado',
  'esperando_confirmacion',
  'finalizado',
];

const labels = {
  creado: 'Creado',
  buscando_conductor: 'Buscando',
  pendiente: 'Oferta',
  aceptado: 'Aceptado',
  conductor_en_camino: 'En camino',
  conductor_llegada: 'Llegó',
  en_curso: 'En curso',
  entregado: 'Entregado',
  esperando_confirmacion: 'Confirmación',
  finalizado: 'Finalizado',
};

const special = {
  cancelado: { icon: '⚠', label: 'Viaje cancelado', color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  rechazado: { icon: '⚠', label: 'Viaje rechazado', color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
  disputa: { icon: '⚠', label: 'Disputa abierta', color: '#d29922', bg: 'rgba(210,153,34,0.12)' },
  sos: { icon: '🚨', label: 'BOTÓN DE PÁNICO — Atender con urgencia', color: '#f85149', bg: 'rgba(248,81,73,0.18)' },
};

export default function ServiceStatusTimeline({ estado }) {
  if (special[estado]) {
    const s = special[estado];
    const isSos = estado === 'sos';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isSos && (() => {
          // For SOS, show timeline up to previous state (assume up to 'en_curso' or last normal) + SOS indicator
          const lastNormal = 'en_curso';
          const idx = flow.indexOf(lastNormal);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
              <div style={{ flex: 1, height: 2, background: '#2ea043', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: '#8b949e' }}>● {labels[lastNormal]} → 🚨 SOS ACTIVO</span>
              <div style={{ flex: 1, height: 2, background: '#f85149', borderRadius: 1, border: '1px dashed #f85149' }} />
            </div>
          );
        })()}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: s.bg, border: `1px solid ${s.color}40` }}>
          <span style={{ fontSize: 18 }}>{s.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
        </div>
      </div>
    );
  }
  const idx = flow.indexOf(estado);
  const activeIdx = idx === -1 ? -1 : idx;
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 640, gap: 0 }}>
        {flow.map((key, i) => {
          const isCompleted = activeIdx > i;
          const isCurrent = activeIdx === i;
          let circleStyle = {};
          let labelColor = '#8b949e';
          let content = '○';
          if (isCompleted) { circleStyle = { background: '#2ea043', borderColor: '#2ea043', color: '#fff' }; content = '✓'; labelColor = '#2ea043'; }
          else if (isCurrent) { circleStyle = { background: '#1f6feb', borderColor: '#1f6feb', color: '#fff', boxShadow: '0 0 0 4px rgba(31,111,235,0.25)' }; content = '●'; labelColor = '#58a6ff'; }
          else { circleStyle = { background: '#21262d', borderColor: '#30363d', color: '#8b949e' }; content = '○'; }
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, ...circleStyle }}>{content}</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: labelColor, textAlign: 'center', whiteSpace: 'nowrap' }}>{labels[key]}</span>
              </div>
              {i < flow.length - 1 && <div style={{ flex: 1, height: 2, background: isCompleted ? '#2ea043' : isCurrent ? '#1f6feb' : '#21262d', margin: '0 2px', marginBottom: 18, borderRadius: 1 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6, fontSize: 10, color: '#8b949e' }}>← deslizar →</div>
    </div>
  );
}
export { flow, labels, special };
