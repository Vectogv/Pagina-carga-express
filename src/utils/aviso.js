// Sonido corto embebido (sin archivo externo) para avisos del panel del moderador.
export const ALERT_SOUND = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

/** Sonido + aviso del navegador (si hay permiso; si no se ha pedido, lo pide). Silencioso si falla. */
export function avisar(titulo, cuerpo) {
  try { new Audio(ALERT_SOUND).play().catch(() => {}); } catch { /* sin audio */ }
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') new Notification(titulo, { body: cuerpo });
    else if (Notification.permission === 'default') Notification.requestPermission();
  } catch { /* sin notificaciones */ }
}
