import { Link } from 'react-router-dom';

const CONTACTO = 'cargaexpressgv@gmail.com';
const FECHA = '3 de octubre de 2026';

// Cada sección: [título, [líneas]]. Las líneas que empiezan con "- " se muestran como lista.
const PRIVACIDAD = [
  ['Responsable y marco legal', ['Responsable: CargaExpress, Popayán, Colombia. Correo: ' + CONTACTO + '.', 'Marco legal: Ley 1581 de 2012 y Decreto 1377 de 2013 (protección de datos personales).']],
  ['Qué datos pedimos', [
    'Pedimos solo lo necesario para que el servicio funcione. No recolectamos datos sensibles (salud, religión, política, orientación sexual, biometría) más allá de lo que se indica aquí.',
    'Clientes:',
    '- nombre, correo, teléfono y edad (para verificar que es mayor de 18);',
    '- la ubicación de origen y destino de cada envío y, mientras el envío está activo, la ubicación del dispositivo;',
    '- los mensajes del chat del viaje y las calificaciones.',
    'Conductores:',
    '- los mismos datos de contacto, más la cédula, la licencia de conducción, la foto, los datos del vehículo (placa, tipo, capacidad, fotos);',
    '- la ubicación del dispositivo mientras está conectado o en un viaje, incluso con la app en segundo plano, para que el cliente pueda seguir su envío.',
    'Datos técnicos: el identificador del dispositivo para las notificaciones, los registros de fallos y estadísticas de uso de la app (Firebase). Todo viaja cifrado (HTTPS).',
  ]],
  ['Para qué los usamos', ['Para conectar a clientes con conductores, mostrar el seguimiento del envío, cobrar la comisión, resolver disputas, prevenir fraudes y cumplir la ley. No vendemos ni compartimos los datos con terceros para publicidad. La app no tiene anuncios.']],
  ['Reserva de los datos del conductor', [
    'Los documentos y datos personales del conductor son reservados. Solo los ve el equipo de CargaExpress para verificarlo. Al cliente se le muestra lo necesario para el servicio: nombre, foto, vehículo, placa y calificación.',
    'Solo se entregan más datos del conductor cuando hay un incidente, como un accidente, un hurto, un daño a la carga o una disputa sin resolver, y solo a:',
    '- el cliente afectado, para que pueda reclamar;',
    '- las autoridades, cuando lo pidan o lo ordene un juez.',
  ]],
  ['Datos del cliente', ['Del cliente guardamos lo mínimo para prestar el servicio. Su teléfono solo se muestra al conductor durante un viaje activo, y el chat bloquea el intercambio de teléfonos y correos.']],
  ['Cuánto tiempo los guardamos', [
    '- Mientras la cuenta esté activa.',
    '- Las cuentas no se borran, se archivan. Cuando el usuario elimina su cuenta, o cuando pasa 6 meses sin uso, la cuenta se archiva: la información queda guardada y no se usa para ningún fin.',
    '- Solo se archiva si no hay viajes activos ni dinero pendiente, ni del cliente ni del conductor. Si hay algo pendiente, soporte revisa el caso.',
  ]],
  ['Sus derechos', [
    'Puede conocer, actualizar y rectificar sus datos, o pedir que se archive su cuenta:',
    '- desde la app: Ajustes → Eliminar mi cuenta;',
    '- desde la web: en la página /eliminar-cuenta;',
    '- por correo a ' + CONTACTO + '.',
    'Respondemos en un plazo máximo de 15 días hábiles. Si no queda satisfecho, puede acudir a la Superintendencia de Industria y Comercio.',
  ]],
];

const TERMINOS = [
  ['Qué es CargaExpress', ['CargaExpress es una plataforma tecnológica de intermediación: pone en contacto a personas que necesitan mover una carga (clientes) con conductores independientes, dueños o tenedores de su vehículo. CargaExpress no presta el servicio de transporte ni es dueña de los vehículos, y los conductores no son sus empleados. El contrato de transporte se celebra directamente entre el cliente y el conductor. CargaExpress cobra al conductor una comisión del 10 % por el uso de la plataforma.']],
  ['Responsabilidad sobre la carga', [
    '- CargaExpress se hace responsable de la carga en caso de fallas, daños, robo o pérdida, siempre que se reporte dentro de las 24 horas siguientes.',
    '- Para eso tenemos los datos del remitente (el cliente) y de quien la transporta (el conductor), además de verificación de documentos, seguimiento en vivo, PIN de entrega, foto al recoger, botón SOS y control antifraude.',
    'Cuando se reporta, CargaExpress:',
    '- abre una disputa y media entre las partes;',
    '- entrega al cliente y a las autoridades los datos del conductor (ver la política de privacidad, punto 4);',
    '- puede suspender o expulsar al conductor responsable.',
    'El cliente declara el contenido de la carga. Se prohíbe enviar mercancía ilegal, peligrosa o de valor no declarado.',
  ]],
  ['Requisitos del conductor', [
    '- Vehículo en buen estado mecánico. Es obligatorio y no se negocia: si un vehículo no está en buenas condiciones, no puede prestar servicios.',
    '- Licencia de conducción vigente, cédula, revisión técnico-mecánica, tarjeta de propiedad y fotos del vehículo verificadas por CargaExpress.',
    '- Cancelar un viaje aceptado baja la calificación del conductor. Una deuda de comisión por encima del tope permitido bloquea la cuenta hasta que se pague.',
  ]],
  ['Reglas para el cliente', [
    '- Debe ser mayor de 18 años.',
    '- El precio final es el de la oferta aceptada, y se paga directamente al conductor.',
    '- No puede cancelar cuando el conductor está a menos de 1 km.',
    '- Si una disputa se resuelve en su contra con un acuerdo de pago, no puede pedir más envíos hasta pagar.',
  ]],
  ['Cuentas', ['Las cuentas no se borran: se archivan cuando el usuario elimina la suya o tras 6 meses sin uso, solo sin viajes activos ni dinero pendiente (ver la política de privacidad). CargaExpress puede suspender cuentas por fraude, por mal uso o por no cumplir estos términos.']],
  ['Ley aplicable', ['Leyes de la República de Colombia. Para los reclamos de consumo, la Superintendencia de Industria y Comercio.']],
];

const ELIMINAR = [
  ['Cómo pedirlo', [
    'Puede pedir que se elimine su cuenta de CargaExpress:',
    '- desde la app: Ajustes → Eliminar mi cuenta;',
    '- por correo a ' + CONTACTO + '.',
  ]],
  ['Qué pasa con su información', ['La cuenta se archiva: la información queda guardada y no se usa para ningún fin.']],
  ['Condiciones', ['Solo se puede si no hay viajes activos ni dinero pendiente (sea cliente o conductor). Si hay algo pendiente, soporte revisa el caso.']],
  ['Cuentas sin uso', ['Una cuenta con 6 meses sin uso también se archiva, con las mismas condiciones.']],
];

const PAGINAS = {
  privacidad: ['Política de privacidad', PRIVACIDAD],
  terminos: ['Términos de uso', TERMINOS],
  eliminar: ['Eliminar mi cuenta', ELIMINAR],
};

function Cuerpo({ lineas }) {
  const out = [];
  let items = [];
  const cierra = () => {
    if (items.length) out.push(<ul key={'u' + out.length}>{items}</ul>);
    items = [];
  };
  lineas.forEach((l, i) => {
    if (l.startsWith('- ')) items.push(<li key={i}>{l.slice(2)}</li>);
    else { cierra(); out.push(<p key={i}>{l}</p>); }
  });
  cierra();
  return out;
}

export default function Legal({ tipo }) {
  const [titulo, secciones] = PAGINAS[tipo];
  const numerar = tipo !== 'eliminar';
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 64px', lineHeight: 1.6 }}>
      <p><Link to="/admin/login">&larr; Carga Express</Link></p>
      <h1>{tipo === 'eliminar' ? titulo : `${titulo} de Carga Express`}</h1>
      <p style={{ color: '#6b7280' }}>Última actualización: {FECHA}</p>
      {secciones.map(([h, l], i) => (
        <section key={h}>
          <h2 style={{ fontSize: '1.15rem', marginTop: 24 }}>{numerar ? `${i + 1}. ` : ''}{h}</h2>
          <Cuerpo lineas={l} />
        </section>
      ))}
      <p style={{ marginTop: 32 }}>Contacto: <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a></p>
      <p>
        {tipo !== 'privacidad' && <><Link to="/privacidad">Política de privacidad</Link> · </>}
        {tipo !== 'terminos' && <><Link to="/terminos">Términos de uso</Link>{tipo !== 'eliminar' && ' · '}</>}
        {tipo !== 'eliminar' && <Link to="/eliminar-cuenta">Eliminar mi cuenta</Link>}
      </p>
    </main>
  );
}
