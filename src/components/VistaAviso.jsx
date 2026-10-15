import { Megaphone, Users, RefreshCw, Bell } from 'lucide-react';
import MarcoCelular from './MarcoCelular';

const POR_DEFECTO = 'Descarga la última versión desde Play Store.';

/**
 * Cómo le llega al usuario: notificación push arriba y el diálogo de la app debajo.
 * tipo 'bandeja': push + fila en Notificaciones; 'grupo': tarjeta en Grupo de conductores (sin push).
 * tipo: 'comunicado' | 'lider' (botón Entendido) | 'actualizacion' (Actualizar/Después) | 'bloqueo' (solo Actualizar).
 */
export default function VistaAviso({ tipo = 'comunicado', titulo, mensaje }) {
  const act = tipo === 'actualizacion' || tipo === 'bloqueo';
  const t = act ? 'Hay una actualización disponible' : (titulo?.trim() || 'Título del comunicado');
  const m = act ? (mensaje?.trim() || POR_DEFECTO) : (mensaje?.trim() || 'Aquí va el mensaje…');
  const Icono = act ? RefreshCw : tipo === 'lider' ? Users : Megaphone;
  const bloqueo = tipo === 'bloqueo';
  if (tipo === 'bandeja' || tipo === 'grupo') {
    const grupo = tipo === 'grupo';
    return (
      <MarcoCelular label="Vista previa del aviso en el celular" caption={grupo ? 'Así lo verá el conductor en Grupo de conductores' : 'Notificación y fila en la bandeja de la app'}>
        {!grupo && (
          <div className="aviso__push">
            <div className="aviso__push-head"><i className="aviso__push-ico" />CargaExpress · ahora</div>
            <b>{t}</b>
            <span className="t">{m}</span>
          </div>
        )}
        <div className="aviso__lista">
          <p className="aviso__lista-t">{grupo ? 'Grupo de conductores' : 'Notificaciones'}</p>
          <div className="aviso__fila">
            <span className="aviso__dlg-ico">{grupo ? <Users size={16} /> : <Bell size={16} />}</span>
            <div>{!grupo && <b>{t}</b>}<p>{m}</p><small>Ahora</small></div>
          </div>
        </div>
      </MarcoCelular>
    );
  }
  return (
    <MarcoCelular label="Vista previa del aviso en el celular" caption="Así lo verá el usuario (notificación y diálogo en la app)">
      <div className="aviso__push">
        <div className="aviso__push-head"><i className="aviso__push-ico" />CargaExpress · ahora</div>
        <b>{t}</b>
        <span className="t">{m}</span>
      </div>
      <div className="aviso__fondo">
        <div className="aviso__dlg">
          <div className="aviso__dlg-ico">{bloqueo ? <RefreshCw size={18} /> : <Icono size={18} />}</div>
          <h4>{bloqueo ? 'Hay una nueva versión de CargaExpress' : t}</h4>
          <p>{bloqueo ? 'Actualízala para seguir usando la app.' : m}</p>
          <span className="aviso__btn">{act ? 'Actualizar' : 'Entendido'}</span>
          {tipo === 'actualizacion' && <span className="aviso__btn aviso__btn--sec">Después</span>}
        </div>
      </div>
    </MarcoCelular>
  );
}
