import { useId } from 'react';
import './Select.css';

export default function Select({ label, error, helperText, disabled, required, id, children, className = '', ...props }) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className={`select-group ${className}`}>
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
