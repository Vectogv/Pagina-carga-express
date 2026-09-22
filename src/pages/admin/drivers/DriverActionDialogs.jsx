import { useState } from 'react';
import { ConfirmDialog, Textarea } from '../../../components/ui';
import { errorMessage } from '../../../utils/format';
import {
  approveVerification, rejectVerification, notifyDriver, reportDriver, deleteUser, suspendUser, setLeader,
} from '../../../api/admin';
import { driverName, driverUserId } from './driverUtils';

/**
 * Diálogos de confirmación de acciones sobre un conductor.
 * action = { type: approve|reject|notify|report|delete|suspend|leader, driver }
 * onDone(message, { refresh }) / onError(message)
 */
export default function DriverActionDialogs({ action, onClose, onDone, onError }) {
  const [nota, setNota] = useState('');
  const driver = action?.driver;
  const u = driver?.usuario || {};
  const name = driverName(driver);
  const type = action?.type;

  const close = () => { setNota(''); onClose(); };

  const run = async (fn, successMsg, fallback, refresh = true) => {
    try {
      await fn();
      onDone(successMsg, { refresh });
    } catch (err) {
      onError(errorMessage(err, fallback));
    }
    setNota('');
  };

  const handlers = {
    approve: () => run(() => approveVerification(driver.id), 'Conductor verificado', 'Error al aprobar'),
    reject: () => run(
      () => rejectVerification(driver.id, nota.trim() ? { nota: nota.trim() } : {}),
      'Verificación rechazada',
      'Error al rechazar',
    ),
    notify: () => run(() => notifyDriver(driver.id), 'Notificación enviada', 'Requiere FCM', false),
    report: () => run(() => reportDriver(driver.id, { descripcion: nota.trim() }), 'Reporte enviado a administración', 'Error al reportar', false),
    delete: () => run(() => deleteUser(driverUserId(driver)), 'Conductor eliminado', 'Error al eliminar'),
    suspend: () => run(
      () => suspendUser(driverUserId(driver)),
      u.suspendido ? 'Conductor activado' : 'Conductor suspendido',
      'Error al cambiar el estado',
    ),
    leader: () => {
      const esLider = !u.esLider;
      return run(() => setLeader(driverUserId(driver), { esLider }), esLider ? 'Marcado como líder' : 'Líder retirado', 'Error al cambiar líder');
    },
  };

  const config = {
    approve: { title: 'Aprobar conductor', message: `¿Aprobar la verificación de ${name}?`, confirmText: 'Aprobar' },
    reject: { title: 'Rechazar verificación', message: `Indica el motivo del rechazo para ${name}.`, confirmText: 'Rechazar', danger: true },
    notify: { title: 'Notificar conductor', message: `¿Enviar una notificación a ${u.email || name}?`, confirmText: 'Notificar' },
    report: { title: 'Reportar conductor', message: `Describe el motivo del reporte de ${name}.`, confirmText: 'Reportar', danger: true },
    delete: {
      title: 'Eliminar conductor',
      message: `¿Eliminar definitivamente a ${name}? Se borrarán sus viajes, ganancias y datos.`,
      confirmText: 'Eliminar',
      danger: true,
    },
    suspend: u.suspendido
      ? { title: 'Activar conductor', message: '¿Activar la cuenta de este conductor para que pueda usar la app?', confirmText: 'Activar' }
      : { title: 'Suspender conductor', message: '¿Suspender la cuenta de este conductor? No podrá usar la app.', confirmText: 'Suspender', danger: true },
    leader: u.esLider
      ? { title: 'Quitar líder', message: '¿Quitar el rol de líder a este conductor?', confirmText: 'Quitar' }
      : { title: 'Marcar como líder', message: '¿Marcar a este conductor como líder?', confirmText: 'Marcar' },
  };

  const current = type ? config[type] : null;

  return (
    <ConfirmDialog
      isOpen={!!current}
      onClose={close}
      onConfirm={current ? handlers[type] : undefined}
      title={current?.title}
      message={current?.message}
      confirmText={current?.confirmText}
      danger={!!current?.danger}
      confirmDisabled={type === 'report' && !nota.trim()}
    >
      {type === 'reject' && (
        <Textarea label="Motivo (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: Documento ilegible" rows={2} />
      )}
      {type === 'report' && (
        <Textarea label="Descripción" required value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
      )}
    </ConfirmDialog>
  );
}
