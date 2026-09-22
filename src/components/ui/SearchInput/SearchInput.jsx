import { Search, X } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Buscar…', ...props }) {
  return (
    <div className="search-input">
      <span className="search-input__icon"><Search size={16} /></span>
      <input
        type="search"
        className="search-input__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        {...props}
      />
      {value && (
        <button type="button" className="search-input__clear" onClick={() => onChange('')} aria-label="Limpiar búsqueda">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
