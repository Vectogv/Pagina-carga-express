/** Filtro segmentado: options = [{ value, label, count? }] */
export default function SegmentedFilter({ options, value, onChange, ariaLabel = 'Filtro' }) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`segmented__item ${value === o.value ? 'segmented__item--active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {typeof o.count === 'number' && <span className="segmented__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
