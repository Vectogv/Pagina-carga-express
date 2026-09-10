import './Select.css';

export default function Select({ label, error, helperText, disabled, required, id, children, ...props }) {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="select-group">
      {label && (
        <label htmlFor={selectId} className="select__label">
          {label} {required && <span className="select__required">*</span>}
        </label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        required={required}
        className={`select__field ${error ? 'select__field--error' : ''}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="select__error">{error}</span>}
      {helperText && !error && <span className="select__helper">{helperText}</span>}
    </div>
  );
}
