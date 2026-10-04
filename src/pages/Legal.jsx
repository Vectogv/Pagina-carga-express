import { Link, NavLink } from 'react-router-dom';
import {
  Truck, Building2, Database, Target, Share2, MapPin, Lock, Clock, UserCheck, ShieldAlert, RefreshCw,
  Info, Route, Percent, Package, IdCard, User, XCircle, Users, Scale, Smartphone, Mail, Archive, ListChecks, Moon,
  BadgeCheck, EyeOff, ShieldCheck,
} from 'lucide-react';
import './Legal.css';

const CONTACTO = 'cargaexpressgv@gmail.com';
const FECHA = '3 de octubre de 2026';

// Líneas: "- " = lista, terminada en ":" = subtítulo, el resto = párrafo.
const PRIVACIDAD = {
  titulo: 'Política de privacidad',
  intro: 'Cómo CargaExpress recoge, usa y protege los datos de clientes y conductores en la app y en este sitio.',
  claves: [[EyeOff, 'No vendemos sus datos'], [BadgeCheck, 'La app no tiene anuncios'], [Lock, 'Todo viaja cifrado (HTTPS)']],
  secciones: [
    ['quienes', 'Quiénes somos', Building2, [
      'CargaExpress es una plataforma de Popayán, Colombia, que conecta a personas que necesitan mover una carga con conductores independientes.',
      'Responsable del tratamiento: CargaExpress. Correo: ' + CONTACTO + '.',
      'Aplicamos la Ley 1581 de 2012 y el Decreto 1377 de 2013 de protección de datos personales.',
    ]],
    ['datos', 'Qué datos recopilamos', Database, [
      'Pedimos solo lo necesario para que el servicio funcione. No pedimos datos sensibles como salud, religión, política, orientación sexual ni biometría.',
      'Clientes:',
      '- Nombre, correo, teléfono y edad (para verificar que es mayor de 18 años).',
      '- Foto de perfil, si decide subirla.',
      '- Direcciones de recogida y entrega de cada envío.',
      '- Mensajes del chat del viaje, tickets de soporte y calificaciones.',
      'Conductores:',
      '- Los mismos datos de contacto, más cédula, licencia de conducción y foto.',
      '- Datos y fotos del vehículo (placa, tipo, capacidad) y de sus documentos.',
      '- Fotos de la carga al recogerla y comprobantes de pago de la comisión.',
      'Datos técnicos (ambos):',
      '- El identificador del dispositivo para enviar notificaciones.',
      '- Registros de fallos y estadísticas de uso de la app (Firebase), que pueden usar el identificador de publicidad de Android solo con fines de analítica.',
    ]],
    ['ubicacion', 'Ubicación', MapPin, [
      '- Cliente: la usamos para ubicar el punto de recogida y mostrarle el mapa. La app del cliente no usa la ubicación en segundo plano.',
      '- Conductor: la usamos mientras está conectado o en un viaje, también con la app en segundo plano, para mostrarle las solicitudes cercanas y para que el cliente pueda seguir su envío en vivo.',
      'El conductor deja de compartir su ubicación al desconectarse.',
    ]],
    ['uso', 'Para qué usamos los datos', Target, [
      '- Conectar a clientes con conductores y mostrar el seguimiento del envío.',
      '- Verificar la identidad y los documentos de los conductores.',
      '- Cobrar la comisión de la plataforma y llevar el registro de pagos.',
      '- Atender soporte, resolver disputas y emergencias (botón SOS).',
      '- Prevenir fraudes y cumplir la ley.',
      '- Mejorar la app a partir de los fallos y las estadísticas de uso.',
    ]],
    ['compartir', 'Con quién los compartimos', Share2, [
      'No vendemos ni compartimos sus datos con terceros para publicidad.',
      'Entre usuarios:',
      '- Al cliente se le muestra lo necesario del conductor: nombre, foto, vehículo, placa, calificación y su ubicación durante el viaje.',
      '- Al conductor se le muestra el nombre del cliente, las direcciones del envío y su teléfono solo durante un viaje activo.',
      'Proveedores que nos prestan el servicio (no pueden usar los datos para otros fines):',
      '- Google Firebase: notificaciones, registro de fallos y estadísticas.',
      '- Mapbox: mapas, rutas y tiempos de llegada.',
      '- Proveedores de alojamiento en la nube donde funciona nuestro servidor.',
      'Datos del conductor en caso de incidente:',
      '- Los documentos del conductor son reservados y solo los ve el equipo de CargaExpress.',
      '- Si hay un accidente, hurto, daño a la carga o una disputa sin resolver, los entregamos al cliente afectado para que pueda reclamar, y a las autoridades cuando lo pidan o lo ordene un juez.',
    ]],
    ['seguridad', 'Cómo protegemos los datos', Lock, [
      '- Toda la información viaja cifrada (HTTPS).',
      '- Solo el personal autorizado de CargaExpress puede ver los documentos y datos personales.',
      '- El chat del viaje bloquea el intercambio de teléfonos, correos y enlaces de WhatsApp o Telegram.',
      '- La entrega se confirma con un PIN que solo conoce el cliente.',
    ]],
    ['conservacion', 'Cuánto tiempo los guardamos', Clock, [
      '- Mientras la cuenta esté activa.',
      '- Cuando el usuario elimina su cuenta, borramos sus datos personales (nombre, correo, teléfono, cédula, fotos, documentos y ubicaciones) en un plazo máximo de 30 días.',
      '- Solo conservamos, sin usarlos para otro fin, los registros de viajes y pagos que exige la ley (hasta 10 años, por las obligaciones contables y tributarias) y los necesarios para atender fraudes o disputas abiertas.',
      '- Una cuenta con 6 meses sin uso se desactiva; el usuario puede pedir su eliminación en cualquier momento.',
    ]],
    ['derechos', 'Sus derechos', UserCheck, [
      'Puede conocer, actualizar y rectificar sus datos, o pedir que se elimine su cuenta:',
      '- Desde la app: Ajustes → Eliminar mi cuenta.',
      '- Desde la web: en la página "Eliminar mi cuenta".',
      '- Por correo a ' + CONTACTO + '.',
      'Respondemos en un plazo máximo de 15 días hábiles. Si no queda satisfecho, puede acudir a la Superintendencia de Industria y Comercio.',
    ]],
    ['menores', 'Menores de edad', ShieldAlert, [
      'CargaExpress es solo para mayores de 18 años. No recogemos a sabiendas datos de menores; si detectamos una cuenta de un menor, la desactivamos.',
    ]],
    ['cambios', 'Cambios a esta política', RefreshCw, [
      'Si cambiamos esta política, actualizamos la fecha de arriba y, si el cambio es importante, lo avisamos en la app.',
    ]],
  ],
};

const TERMINOS = {
  titulo: 'Términos de uso',
  intro: 'Las reglas para usar CargaExpress como cliente o como conductor.',
  claves: [[Percent, 'Comisión del 10 % al conductor'], [ShieldCheck, 'Carga respaldada si se reporta en 24 h'], [User, 'Solo mayores de 18 años']],
  secciones: [
    ['que-es', 'Qué es CargaExpress', Info, [
      'CargaExpress es una plataforma tecnológica de intermediación: pone en contacto a personas que necesitan mover una carga (clientes) con conductores independientes, dueños o tenedores de su vehículo.',
      'CargaExpress no presta el servicio de transporte ni es dueña de los vehículos, y los conductores no son sus empleados. El contrato de transporte se celebra directamente entre el cliente y el conductor.',
    ]],
    ['como-funciona', 'Cómo funciona', Route, [
      '- El cliente publica el envío con origen, destino y el precio que ofrece.',
      '- Los conductores cercanos hacen sus ofertas.',
      '- El cliente acepta la oferta que prefiera y sigue el viaje en vivo.',
      '- La entrega se cierra con el PIN del cliente o de quien recibe.',
    ]],
    ['precio', 'Precio y comisión', Percent, [
      '- El precio final es el de la oferta aceptada, y el cliente lo paga directamente al conductor.',
      '- CargaExpress cobra al conductor una comisión del 10 % de cada viaje por el uso de la plataforma.',
      '- Una deuda de comisión por encima del tope permitido bloquea la cuenta del conductor hasta que se pague.',
    ]],
    ['carga', 'Responsabilidad sobre la carga', Package, [
      'CargaExpress se hace responsable de la carga en caso de fallas, daños, robo o pérdida, siempre que se reporte dentro de las 24 horas siguientes.',
      'Para eso contamos con los datos del cliente y del conductor, verificación de documentos, seguimiento en vivo, PIN de entrega, foto al recoger, botón SOS y control antifraude.',
      'Cuando se reporta, CargaExpress:',
      '- Abre una disputa y media entre las partes.',
      '- Entrega al cliente y a las autoridades los datos del conductor (ver la política de privacidad).',
      '- Puede suspender o expulsar al conductor responsable.',
      'El cliente declara el contenido de la carga. Se prohíbe enviar mercancía ilegal, peligrosa o de valor no declarado.',
    ]],
    ['conductor', 'Requisitos del conductor', IdCard, [
      '- Vehículo en buen estado mecánico. Es obligatorio y no se negocia: si un vehículo no está en buenas condiciones, no puede prestar servicios.',
      '- Licencia de conducción vigente, cédula, revisión técnico-mecánica, tarjeta de propiedad y fotos del vehículo verificadas por CargaExpress.',
    ]],
    ['cliente', 'Reglas para el cliente', User, [
      '- Debe ser mayor de 18 años.',
      '- Debe declarar bien la carga y estar en el punto de recogida a tiempo.',
      '- Si una disputa se resuelve en su contra con un acuerdo de pago, no puede pedir más envíos hasta pagar.',
    ]],
    ['cancelaciones', 'Cancelaciones', XCircle, [
      '- El cliente no puede cancelar cuando el conductor ya está a menos de 1 km del punto de recogida.',
      '- El conductor puede cancelar con una justificación, pero cada cancelación baja su calificación.',
    ]],
    ['cuentas', 'Cuentas', Users, [
      'El usuario puede eliminar su cuenta en cualquier momento, siempre que no tenga viajes activos ni dinero pendiente. Sus datos personales se borran en máximo 30 días (ver la política de privacidad). Una cuenta con 6 meses sin uso se desactiva.',
      'CargaExpress puede suspender cuentas por fraude, por mal uso o por no cumplir estos términos.',
    ]],
    ['ley', 'Ley aplicable', Scale, [
      'Estos términos se rigen por las leyes de la República de Colombia. Para los reclamos de consumo, puede acudir a la Superintendencia de Industria y Comercio.',
    ]],
  ],
};

const ELIMINAR = {
  titulo: 'Eliminar mi cuenta',
  intro: 'Cómo pedir que se elimine su cuenta de CargaExpress (app del cliente y app del conductor) y qué pasa con su información.',
  claves: [[Smartphone, 'Desde la app, en 1 minuto'], [Archive, 'Datos borrados en 30 días'], [Mail, 'También por correo']],
  secciones: [
    ['app', 'Desde la app', Smartphone, [
      '- Abra la app e inicie sesión.',
      '- Vaya a Ajustes → Eliminar mi cuenta.',
      '- Escriba ELIMINAR para confirmar.',
      'Si tiene un viaje activo, una disputa o dinero pendiente, la app le dice el motivo y soporte revisa el caso.',
    ]],
    ['correo', 'Por correo', Mail, [
      'Escriba a ' + CONTACTO + ' desde el correo con el que se registró, con el asunto "Eliminar mi cuenta". Respondemos en un máximo de 15 días hábiles.',
    ]],
    ['informacion', 'Qué pasa con su información', Archive, [
      'Su cuenta se cierra de inmediato: ya no puede iniciar sesión.',
      'En un plazo máximo de 30 días borramos sus datos personales: nombre, correo, teléfono, cédula, foto de perfil, documentos, fotos del vehículo, contacto de emergencia y ubicaciones.',
      'Solo conservamos los registros de viajes y pagos que exige la ley, hasta por 10 años (obligaciones contables y tributarias), y lo necesario para atender fraudes o disputas abiertas. No los usamos para ningún otro fin.',
    ]],
    ['condiciones', 'Condiciones', ListChecks, [
      'Solo se puede si no hay viajes activos ni dinero pendiente (sea cliente o conductor). Si hay algo pendiente, soporte revisa el caso.',
    ]],
    ['sin-uso', 'Cuentas sin uso', Moon, [
      'Una cuenta con 6 meses sin uso se desactiva. Para que se borren sus datos, pida la eliminación como se explica arriba.',
    ]],
  ],
};

const PAGINAS = { privacidad: PRIVACIDAD, terminos: TERMINOS, eliminar: ELIMINAR };
const PESTANAS = [['/privacidad', 'Privacidad'], ['/terminos', 'Términos'], ['/eliminar-cuenta', 'Eliminar cuenta']];

function Cuerpo({ lineas }) {
  const out = [];
  let items = [];
  const cierra = () => {
    if (items.length) out.push(<ul key={'u' + out.length}>{items}</ul>);
    items = [];
  };
  lineas.forEach((l, i) => {
    if (l.startsWith('- ')) items.push(<li key={i}>{l.slice(2)}</li>);
    else {
      cierra();
      out.push(l.endsWith(':') ? <h3 key={i}>{l.slice(0, -1)}</h3> : <p key={i}>{l}</p>);
    }
  });
  cierra();
  return out;
}

export default function Legal({ tipo }) {
  const { titulo, intro, claves, secciones } = PAGINAS[tipo];
  return (
    <div className="legal">
      <header className="legal__top">
        <Link to="/privacidad" className="legal__brand">
          <span className="legal__logo"><Truck size={18} /></span>
          Carga Express
        </Link>
        <nav className="legal__tabs">
          {PESTANAS.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
      </header>

      <section className="legal__hero">
        <h1>{titulo}</h1>
        <p>{intro}</p>
        <span className="legal__fecha">Última actualización: {FECHA}</span>
        <ul className="legal__claves">
          {claves.map(([Icono, txt]) => <li key={txt}><Icono size={16} />{txt}</li>)}
        </ul>
      </section>

      <div className="legal__layout">
        <aside className="legal__indice">
          <span>En esta página</span>
          {secciones.map(([id, h], i) => <a key={id} href={'#' + id}>{i + 1}. {h}</a>)}
        </aside>
        <main className="legal__contenido">
          {secciones.map(([id, h, Icono, lineas], i) => (
            <section key={id} id={id} className="legal__card">
              <h2><span className="legal__icono"><Icono size={18} /></span>{i + 1}. {h}</h2>
              <Cuerpo lineas={lineas} />
            </section>
          ))}
          <footer className="legal__pie">
            <p>¿Dudas? Escríbanos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a></p>
            <p>© {new Date().getFullYear()} Carga Express · Popayán, Colombia</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
