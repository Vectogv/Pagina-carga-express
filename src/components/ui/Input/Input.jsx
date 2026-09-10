import './Input.css';

export default function Input({ label, placeholder, error, helperText, disabled, required, id, ...props }) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label} {required && <span className="input__required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input__field ${error ? 'input__field--error' : ''} ${disabled ? 'input__field--disabled' : ''}`}
        {...props}
      />
      {error && <span className="input__error">{error}</span>}
      {helperText && !error && <span className="input__helper">{helperText}</span>}
    </div>
  );
}
