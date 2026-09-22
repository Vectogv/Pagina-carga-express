// Las zonas/ciudades vienen de Configuración → Cobertura (hook useZonas).

export const getZonaModerador = (u) => u?.zonaModerador || u?.zona_moderador || '';

export const userId = (u) => u?.id || u?._id;
