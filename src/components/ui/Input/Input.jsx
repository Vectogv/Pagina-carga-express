import { useId } from 'react';
import './Input.css';

export default function Input({ label, error, helperText, disabled, required, id, className = '', ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label} {required && <span className="input__required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`input__field ${error ? 'input__field--error' : ''} ${disabled ? 'input__field--disabled' : ''}`}
        {...props}
      />
      {error && <span className="input__error">{error}</span>}
      {helperText && !error && <span className="input__helper">{helperText}</span>}
    </div>
  );
}

export function Textarea({ label, error, helperText, disabled, required, id, rows = 4, className = '', ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label} {required && <span className="input__required">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`input__field input__field--textarea ${error ? 'input__field--error' : ''} ${disabled ? 'input__field--disabled' : ''}`}
        {...props}
      />
      {error && <span className="input__error">{error}</span>}
      {helperText && !error && <span className="input__helper">{helperText}</span>}
    </div>
  );
}
