import './Button.css';

/**
 * variant: primary | secondary | outline | ghost | success | danger | warning
 *          | soft-primary | soft-success | soft-warning | soft-danger
 * size: sm | md | lg | icon
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  fullWidth = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${loading ? 'btn--loading' : ''} ${className}`}
      {...props}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {icon && !loading && <span className="btn__icon">{icon}</span>}
      {children !== undefined && children !== null && children !== '' && <span className="btn__label">{children}</span>}
    </button>
  );
}
