import { Megaphone, Users, RefreshCw } from 'lucide-react';
import MarcoCelular from './MarcoCelular';

const POR_DEFECTO = 'Hay una versión nueva de CargaExpress. Actualiza para tener las últimas mejoras.';

/**
 * Cómo le llega al usuario: notificación push arriba y el diálogo de la app debajo.
 * tipo: 'comunicado' | 'lider' (botón Entendido) | 'actualizacion' (Actualizar/Después) | 'bloqueo' (solo Actualizar).
 */
export default function VistaAviso({ tipo = 'comunicado', titulo, mensaje }) {
  const act = tipo === 'actualizacion' || tipo === 'bloqueo';
  const t = act ? 'Hay una actualización disponible' : (titulo?.trim() || 'Título del comunicado');
  const m = act ? (mensaje?.trim() || POR_DEFECTO) : (mensaje?.trim() || 'Aquí va el mensaje…');
  const Icono = act ? RefreshCw : tipo === 'lider' ? Users : Megaphone;
  const bloqueo = tipo === 'bloqueo';
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
