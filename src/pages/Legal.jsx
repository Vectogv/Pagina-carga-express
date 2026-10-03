import { Link } from 'react-router-dom';

const CONTACTO = 'cargaexpressgv@gmail.com';
const FECHA = '2 de octubre de 2026';

const PRIVACIDAD = [
  ['Quiénes somos', 'Carga Express es una plataforma de fletes en Popayán, Colombia, que conecta a clientes que necesitan mover carga con conductores que ofrecen su vehículo. Esta política explica cómo tratamos tus datos personales en la aplicación móvil y en el panel web.'],
  ['Datos que recogemos', 'Nombre y apellido, correo electrónico, teléfono, edad y número de cédula; contacto de emergencia; ubicación GPS durante los viajes (y mientras el conductor está conectado); fotos de documentos y del vehículo (conductores), fotos de la carga al recoger y de la entrega; mensajes del chat del viaje y de soporte; datos de los viajes, ofertas, pagos de comisión y calificaciones; y datos técnicos del dispositivo, como el token de notificaciones. Si entras con Google, recibimos tu nombre, correo y foto de perfil.'],
  ['Para qué los usamos', 'Crear y administrar tu cuenta; publicar, ofertar, aceptar y hacer seguimiento a los viajes; calcular rutas y tiempos de llegada; verificar a los conductores y prevenir fraudes; calcular la comisión y los pagos; atender soporte, reportes y disputas; enviarte notificaciones sobre tus viajes; y cumplir obligaciones legales. No vendemos tus datos.'],
  ['Con quién los compartimos', 'Con la otra parte del viaje (el cliente ve el nombre, la placa y la ubicación del conductor mientras dura el servicio, y el conductor ve el origen, el destino y el nombre de quien envía o recibe). Con proveedores que nos prestan servicios: Google y Firebase (inicio de sesión, notificaciones y análisis de fallos), Mapbox (mapas y rutas), Railway (alojamiento del servidor y la base de datos), Brevo (envío de correos, como el código de recuperación de contraseña) y Vercel (panel web). También con autoridades cuando la ley lo exija.'],
  ['Respaldos', 'Guardamos copias de seguridad de la base de datos en Google Drive, en una cuenta controlada por Carga Express, para poder recuperar la información ante un fallo. Solo el personal autorizado accede a ellas.'],
  ['Cuánto tiempo los conservamos', 'Conservamos tus datos mientras tu cuenta esté activa. Los registros de viajes, pagos y reportes se guardan el tiempo necesario para cumplir obligaciones legales y contables y para resolver disputas. Los respaldos se mantienen unos 30 días. Si pides eliminar tu cuenta, borramos o anonimizamos tus datos, salvo los que debamos conservar por ley.'],
  ['Tus derechos (Ley 1581 de 2012, Habeas Data)', 'Como titular puedes conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización que nos diste; ser informado del uso que damos a tus datos; presentar quejas ante la Superintendencia de Industria y Comercio; revocar la autorización y solicitar la supresión de tus datos cuando no se respeten los principios y garantías legales; y acceder gratuitamente a ellos. Para ejercerlos escríbenos al correo de contacto; responderemos en los plazos que fija la ley.'],
  ['Seguridad', 'Usamos conexiones cifradas (HTTPS), contraseñas almacenadas con hash y acceso restringido a la información. Ningún sistema es infalible; si detectamos un incidente que te afecte, te lo informaremos.'],
  ['Menores de edad', 'La plataforma es solo para mayores de 18 años. No recogemos datos de menores de forma deliberada.'],
  ['Cambios a esta política', 'Podemos actualizar esta política; publicaremos la versión vigente en esta página con su fecha.'],
];

const TERMINOS = [
  ['Aceptación', 'Al crear una cuenta o usar Carga Express aceptas estos términos y la política de privacidad.'],
  ['Qué es el servicio', 'Carga Express conecta a clientes con conductores independientes. La plataforma no transporta la carga ni es parte del contrato de transporte entre ambos; facilita el contacto, el seguimiento y el cobro.'],
  ['Edad y cuenta', 'Debes tener al menos 18 años. Eres responsable de la veracidad de tus datos y de mantener segura tu contraseña. Los conductores deben presentar documentos vigentes (licencia, SOAT, tarjeta de propiedad, entre otros) y ser verificados antes de operar.'],
  ['Precio y comisión', 'El cliente publica su precio y los conductores ofertan; el precio de la oferta aceptada es el final. Carga Express cobra una comisión del 10 % sobre cada viaje finalizado, que se registra como deuda del conductor y que este debe pagar. Una deuda por encima del tope permitido, o un acuerdo de pago incumplido, puede suspender la cuenta.'],
  ['Entrega y confirmación', 'La entrega se confirma con un PIN que conoce el cliente. Si el cliente rechaza el cierre, el viaje pasa a disputa y la resuelve el equipo de Carga Express.'],
  ['Conducta', 'Está prohibido el fraude, el uso de datos falsos, el acoso, el transporte de mercancía ilegal o peligrosa no declarada, compartir teléfonos o medios de contacto para evitar la comisión, y manipular la ubicación GPS. Las cancelaciones abusivas pueden restar calificación al conductor.'],
  ['Suspensión', 'Podemos suspender o cerrar cuentas que incumplan estos términos o que presenten indicios de fraude.'],
  ['Responsabilidad', 'Carga Express no responde por daños, pérdidas o retrasos de la carga causados por el conductor o por terceros, ni por la información que los usuarios publiquen. Esto no limita derechos que la ley colombiana te reconozca como consumidor.'],
  ['Ley aplicable', 'Estos términos se rigen por las leyes de Colombia.'],
  ['Cambios y contacto', `Podemos actualizar estos términos y publicaremos la versión vigente aquí. Para consultas escribe a ${CONTACTO}.`],
];

export default function Legal({ tipo }) {
  const priv = tipo === 'privacidad';
  const titulo = priv ? 'Política de privacidad' : 'Términos de uso';
  const secciones = priv ? PRIVACIDAD : TERMINOS;
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 64px', lineHeight: 1.6 }}>
      <p><Link to="/admin/login">&larr; Carga Express</Link></p>
      <h1>{titulo} de Carga Express</h1>
      <p style={{ color: '#6b7280' }}>Última actualización: {FECHA}</p>
      {secciones.map(([h, t], i) => (
        <section key={h}>
          <h2 style={{ fontSize: '1.15rem', marginTop: 24 }}>{i + 1}. {h}</h2>
          <p>{t}</p>
        </section>
      ))}
      <p style={{ marginTop: 32 }}>Contacto: <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a></p>
      <p><Link to={priv ? '/terminos' : '/privacidad'}>{priv ? 'Términos de uso' : 'Política de privacidad'}</Link></p>
    </main>
  );
}
