import './Badge.css';

const VARIANTS = ['success', 'warning', 'danger', 'info', 'neutral', 'primary', 'violet'];

export default function Badge({ children, variant = 'neutral', size = 'md', className = '', ...props }) {
  const v = VARIANTS.includes(variant) ? variant : 'neutral';
  return (
    <span className={`badge badge--${v} badge--${size} ${className}`} {...props}>
      {children}
    </span>
  );
}
