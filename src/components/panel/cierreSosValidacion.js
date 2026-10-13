// Validación del cierre de un SOS (sin componentes, para que Fast Refresh no se queje).
export const CIERRE_VACIO = { tipoCierre: '', observacion: '' };
export const OBS_MIN = 20;
export const OBS_MAX = 1000;

export const cierreSosValido = (c) => {
  const n = (c?.observacion || '').trim().length;
  return !!c?.tipoCierre && n >= OBS_MIN && n <= OBS_MAX;
};

export const cuerpoCierreSos = (c) => ({ tipoCierre: c.tipoCierre, observacion: c.observacion.trim() });
