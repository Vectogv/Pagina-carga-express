import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useZonas } from '../hooks/useZonas';

const Ctx = createContext(null);

const STORAGE_KEY = 'moderatorCity';

// Ciudad seleccionada por el admin en el panel de moderación.
// Los moderadores NO cambian ciudad: el backend la fija con su zonaModerador.
export function ModeratorCityProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin' || user?.role === 'admin';
  const zonas = useZonas();
  const [ciudad, setCiudad] = useState(() => localStorage.getItem(STORAGE_KEY) || 'general');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, ciudad);
  }, [ciudad]);

  const value = useMemo(() => {
    const labels = { general: 'General (todas)', ...Object.fromEntries(zonas.map((z) => [z.value, z.label])) };
    return {
      zonas,
      isAdmin,
      ciudad,
      setCiudad,
      ciudadLabel: labels[ciudad] || ciudad,
      // Params ?ciudad= para los GET de moderación, solo si el admin eligió una ciudad concreta.
      ciudadParams: isAdmin && ciudad !== 'general' ? { ciudad } : {},
    };
  }, [isAdmin, ciudad, zonas]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModeratorCity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useModeratorCity debe usarse dentro de ModeratorCityProvider');
  return ctx;
}