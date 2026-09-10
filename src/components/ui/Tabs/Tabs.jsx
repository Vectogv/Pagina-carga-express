import './Tabs.css';

export function Tabs({ children, defaultValue, value, onValueChange, className = '' }) {
  return <div className={`tabs ${className}`}>{children}</div>;
}

export function TabsList({ children, className = '' }) {
  return <div className={`tabs__list ${className}`}>{children}</div>;
}

export function TabsTrigger({ value, activeValue, onValueChange, children, disabled }) {
  const isActive = value === activeValue;
  return (
    <button
      disabled={disabled}
      onClick={() => !disabled && onValueChange?.(value)}
      className={`tabs__trigger ${isActive ? 'tabs__trigger--active' : ''} ${disabled ? 'tabs__trigger--disabled' : ''}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, activeValue, children }) {
  if (value !== activeValue) return null;
  return <div className="tabs__content">{children}</div>;
}
