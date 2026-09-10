import './Badge.css';

const variantMap = {
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
  info: 'badge--info',
  neutral: 'badge--neutral',
  primary: 'badge--primary',
};

export default function Badge({ children, variant = 'neutral', size = 'md', ...props }) {
  return (
    <span className={`badge ${variantMap[variant] || 'badge--neutral'} badge--${size}`} {...props}>
      {children}
    </span>
  );
}
