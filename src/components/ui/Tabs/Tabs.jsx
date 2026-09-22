import { createContext, useContext, useState } from 'react';
import './Tabs.css';

const TabsContext = createContext(null);

/** Tabs controladas (value + onValueChange) o no controladas (defaultValue). */
export function Tabs({ children, defaultValue, value, onValueChange, className = '' }) {
  const [internal, setInternal] = useState(defaultValue);
  const active = value !== undefined ? value : internal;
  const setActive = (v) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={`tabs ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }) {
  return <div className={`tabs__list ${className}`} role="tablist">{children}</div>;
}

export function TabsTrigger({ value, children, disabled }) {
  const ctx = useContext(TabsContext);
  const isActive = ctx?.active === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && ctx?.setActive(value)}
      className={`tabs__trigger ${isActive ? 'tabs__trigger--active' : ''} ${disabled ? 'tabs__trigger--disabled' : ''}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }) {
  const ctx = useContext(TabsContext);
  if (ctx?.active !== value) return null;
  return <div className="tabs__content" role="tabpanel">{children}</div>;
}
