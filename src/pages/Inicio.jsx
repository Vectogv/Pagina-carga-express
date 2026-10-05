import { Link } from 'react-router-dom';
import {
  Truck, MapPin, Tag, Navigation, KeyRound, Star, UserPlus, Power, HandCoins, Camera, Wallet,
  CalendarClock, Heart, Siren, Users, BadgeCheck, MessageSquare, ShieldCheck, Package,
  Container, Van, Car, Motorbike, Mail, ChevronDown, Menu, Handshake, Scale, Eye,
} from 'lucide-react';
import './Inicio.css';

const CONTACTO = 'cargaexpressgv@gmail.com';
const GRUPO = 'https://groups.google.com/g/cargaexpress-beta';
const PLAY_CLIENTE = 'https://play.google.com/apps/testing/co.cargaexpress.app';
const PLAY_CONDUCTOR = 'https://play.google.com/apps/testing/co.cargaexpress.conductor';

const MENU = [
  ['inicio', 'Inicio'], ['nosotros', 'Quiénes somos'], ['como-funciona', 'Cómo funciona'], ['conductores', 'Conductores'],
  ['seguridad', 'Seguridad'], ['preguntas', 'Preguntas'], ['contacto', 'Contacto'],
];

const VALORES = [
  [Handshake, 'Trato directo', 'Cliente y conductor acuerdan el precio entre ellos. Sin intermediarios que inflen la tarifa.'],
  [Scale, 'Reglas claras', 'Una sola comisión del 10 % para el conductor. El cliente no paga cargos ocultos.'],
  [Eye, 'Todo a la vista', 'Ruta, ubicación del conductor y estado del viaje en tiempo real, de principio a fin.'],
];

const PASOS_CLIENTE = [
  [MapPin, 'Publica tu envío', 'Marca origen y destino en el mapa y ve la ruta con km y minutos. Elige el vehículo y pon tu precio.'],
  [Tag, 'Recibe ofertas', 'Los conductores a menos de 20 km te ofertan. Escoge la que más te sirva.'],
  [Navigation, 'Síguelo en vivo', 'Ve al conductor en el mapa con su tiempo de llegada, chatea con él y recibe un aviso en cada paso.'],
  [KeyRound, 'Confirma con tu PIN', 'El viaje solo se cierra con tu PIN de 4 dígitos. Después calificas al conductor.'],
];

const EXTRAS_CLIENTE = [[CalendarClock, 'Reserva para otra fecha y hora'], [Heart, 'Guarda tus rutas favoritas'], [Siren, 'Botón SOS y soporte por tickets']];

const PASOS_CONDUCTOR = [
  [UserPlus, 'Regístrate', 'Datos, foto, vehículo, zona y documentos. Nuestro equipo te verifica antes de activarte.'],
  [Power, 'Conéctate', 'Ve las solicitudes cercanas con el tipo de vehículo, la ruta y el precio.'],
  [HandCoins, 'Oferta y recoge', 'Si el cliente acepta, la app te lleva a recoger con navegación.'],
  [Camera, 'Entrega', 'Toma foto de la carga al recogerla y cierra el viaje con el PIN del cliente.'],
  [Wallet, 'Ve tus ganancias', 'Por día, semana y mes, y descárgalas en PDF.'],
];

const EXTRAS_CONDUCTOR = [[Users, 'Grupo de conductores de tu zona'], [CalendarClock, 'Reservas con anticipación'], [Navigation, 'Pide más plazo si te retrasas']];

const SEGURIDAD = [
  [KeyRound, 'PIN de entrega', 'La carga solo se da por entregada cuando el cliente lo confirma.'],
  [Navigation, 'GPS en vivo', 'Seguimiento durante todo el viaje.'],
  [BadgeCheck, 'Conductores verificados', 'Documentos revisados y mayores de 18 años.'],
  [Siren, 'Botón SOS', 'Avisa al equipo de CargaExpress al instante.'],
  [MessageSquare, 'Chat en la app', 'Hablas con el conductor sin compartir tu número.'],
  [Camera, 'Foto de la carga', 'El conductor la fotografía al recogerla.'],
  [Star, 'Calificaciones', 'Cliente y conductor se califican mutuamente.'],
  [ShieldCheck, 'Moderadores por zona', 'Resolvemos disputas, y respondemos por la carga reportada en 24 h.'],
];

const VEHICULOS = [[Container, 'Furgón cerrado'], [Truck, 'Estacas'], [Van, 'Camioneta'], [Car, 'Carro'], [Motorbike, 'Moto']];

const PREGUNTAS = [
  ['¿Quién pone el precio?', 'Tú. Publicas el envío con lo que quieres pagar y los conductores cercanos te hacen ofertas. Eliges la que prefieras.'],
  ['¿Cómo sé que mi carga llegó?', 'El conductor no puede cerrar el viaje sin tu PIN de 4 dígitos. Si recibe otra persona, le compartes el PIN.'],
  ['¿Puedo programar un envío?', 'Sí. Puedes reservar un envío para otra fecha y hora.'],
  ['¿Qué pasa si hay un problema?', 'Usa el botón SOS durante el viaje o abre un ticket de soporte. Los moderadores de tu zona median en las disputas.'],
  ['¿Cuánto cobra CargaExpress al conductor?', 'Solo el 10 % de cada viaje.'],
  ['¿Qué necesito para ser conductor?', 'Ser mayor de 18 años, tener tu vehículo en buen estado y subir tus documentos para que el equipo los verifique.'],
  ['¿Cómo descargo la app?', 'Estamos en beta cerrada: únete al grupo de Google y luego abre el enlace de prueba de la app que necesitas.'],
];

const CAPTURAS = ['cliente_1', 'cliente_3', 'cliente_2', 'cliente_4', 'conductor_1', 'conductor_2', 'conductor_3', 'conductor_4'];

// Caja 3D en CSS: frente/lados/techo. El tamaño sale de --w, --h, --d.
const Caja = ({ className, children }) => (
  <div className={`caja ${className}`}>
    <i className="caja__z1">{children}</i><i className="caja__z2" /><i className="caja__x1" /><i className="caja__x2" /><i className="caja__y1" />
  </div>
);

function Camion3D() {
  return (
    <div className="camion" aria-hidden="true">
      <div className="camion__escena">
        <div className="camion__via"><div className="camion__lineas" /></div>
        <div className="camion__cuerpo">
          <Caja className="camion__carga"><span>CARGA EXPRESS</span></Caja>
          <Caja className="camion__cabina" />
          {[24, 128, 206].map((x) => <b key={x} className="camion__rueda" style={{ left: x }} />)}
        </div>
      </div>
    </div>
  );
}

function Pasos({ pasos }) {
  return (
    <ol className="inicio__ruta" style={{ '--n': pasos.length }}>
      {pasos.map(([Icono, t, d], i) => (
        <li key={t} className="inicio__parada revela">
          <span className="inicio__icono"><Icono size={20} /></span>
          <small>Parada {i + 1}</small>
          <h3>{t}</h3>
          <p>{d}</p>
        </li>
      ))}
    </ol>
  );
}

const Chips = ({ items }) => (
  <ul className="inicio__chips">{items.map(([Icono, t]) => <li key={t}><Icono size={16} />{t}</li>)}</ul>
);

const Telefono = ({ c, alt, eager }) => (
  <img
    src={`/capturas/captura_${c}.jpg`} alt={alt} width="540" height="960" decoding="async"
    loading={eager ? 'eager' : 'lazy'} className="inicio__telefono"
  />
);

export default function Inicio() {
  return (
    <div className="inicio">
      <header className="inicio__top">
        <a href="#inicio" className="inicio__brand"><span className="inicio__logo"><Truck size={18} /></span>Carga Express</a>
        <nav className="inicio__nav">{MENU.slice(1).map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</nav>
        <details className="inicio__menu">
          <summary aria-label="Menú"><Menu size={22} /></summary>
          <nav onClick={(e) => e.target.closest('a') && e.currentTarget.parentElement.removeAttribute('open')}>
            {MENU.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}
          </nav>
        </details>
        <a href="#beta" className="inicio__btn inicio__btn--sm">Descargar</a>
      </header>

      <div className="inicio__hero-banda">
      <section id="inicio" className="inicio__hero">
        <div className="inicio__hero-texto">
          <span className="inicio__tag">Beta cerrada · Android</span>
          <h1>Envía tu carga <em>sin complicaciones</em></h1>
          <p>Fletes y mudanzas pequeñas. Tú pones el precio, los conductores ofertan y sigues el viaje en vivo hasta que confirmas la entrega.</p>
          <div className="inicio__ctas">
            <a href="#beta" className="inicio__btn"><Package size={18} />Soy cliente</a>
            <a href="#conductores" className="inicio__btn inicio__btn--ghost"><Truck size={18} />Quiero ser conductor</a>
          </div>
        </div>
        <div className="inicio__hero-visual">
          <Camion3D />
          <dl className="inicio__guia">
            <div><dt>Ruta</dt><dd>12,4 km · 28 min</dd></div>
            <div><dt>Vehículo</dt><dd>Furgón cerrado</dd></div>
            <div><dt>Tu oferta</dt><dd>$ 45.000</dd></div>
            <div><dt>Entrega</dt><dd>PIN • • • •</dd></div>
          </dl>
        </div>
      </section>
      </div>

      <div className="inicio__cinta" aria-hidden="true" />

      <section id="nosotros" className="inicio__seccion">
        <div className="inicio__split inicio__split--texto">
          <div>
            <span className="inicio__ceja">Quiénes somos</span>
            <h2>Movemos lo que tú necesitas mover</h2>
          </div>
          <div className="inicio__prosa">
            <p>Carga Express nació para resolver algo cotidiano: conseguir quién te lleve una carga, un trasteo pequeño o un pedido de tu negocio sin llamar a diez números ni pagar de más.</p>
            <p>Conectamos a quienes necesitan enviar con conductores independientes de su misma zona. El cliente propone el precio, el conductor oferta y la app acompaña el viaje hasta que la carga llega.</p>
          </div>
        </div>
        <ul className="inicio__grid inicio__grid--3">
          {VALORES.map(([Icono, t, d]) => (
            <li key={t} className="inicio__card revela">
              <span className="inicio__icono"><Icono size={20} /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="como-funciona" className="inicio__seccion">
        <span className="inicio__ceja">Para clientes</span>
        <h2>Cómo funciona</h2>
        <p className="inicio__lead">Cuatro paradas para mover lo que necesites.</p>
        <Pasos pasos={PASOS_CLIENTE} />
        <Chips items={EXTRAS_CLIENTE} />
      </section>

      <section id="conductores" className="inicio__seccion">
        <div className="inicio__split">
          <div>
            <span className="inicio__ceja">Para conductores</span>
            <h2>Gana con tu vehículo</h2>
            <p className="inicio__lead">Elige los viajes que te sirven y oferta tu precio.</p>
            <div className="inicio__comision"><strong>10 %</strong><span>de comisión por viaje.<br />Nada más.</span></div>
            <Chips items={EXTRAS_CONDUCTOR} />
          </div>
          <div className="inicio__par">
            <Telefono c="conductor_1" alt="App CargaExpress Conductor con solicitudes cercanas" />
            <Telefono c="conductor_2" alt="App CargaExpress Conductor con la ruta hasta la entrega" />
          </div>
        </div>
        <Pasos pasos={PASOS_CONDUCTOR} />
      </section>

      <section id="seguridad" className="inicio__seccion">
        <span className="inicio__ceja">Seguridad</span>
        <h2>Tu carga, en buenas manos</h2>
        <p className="inicio__lead">Cada viaje tiene varias capas de protección.</p>
        <ul className="inicio__grid">
          {SEGURIDAD.map(([Icono, t, d]) => (
            <li key={t} className="inicio__card revela">
              <span className="inicio__icono"><Icono size={20} /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="inicio__seccion">
        <span className="inicio__ceja">Flota</span>
        <h2>Tipos de vehículo</h2>
        <ul className="inicio__vehiculos">
          {VEHICULOS.map(([Icono, t]) => <li key={t} className="inicio__card revela"><Icono size={34} strokeWidth={1.6} />{t}</li>)}
        </ul>
      </section>

      <section className="inicio__seccion">
        <span className="inicio__ceja">Capturas</span>
        <h2>Así se ve la app</h2>
        <div className="inicio__galeria">
          {CAPTURAS.map((c) => <Telefono key={c} c={c} alt={`Captura de la app (${c.replace('_', ' ')})`} />)}
        </div>
      </section>

      <section id="preguntas" className="inicio__seccion inicio__seccion--angosta">
        <span className="inicio__ceja">Dudas</span>
        <h2>Preguntas frecuentes</h2>
        {PREGUNTAS.map(([p, r]) => (
          <details key={p} className="inicio__card inicio__faq">
            <summary>{p}<ChevronDown size={18} /></summary>
            <p>{r}</p>
          </details>
        ))}
      </section>

      <section id="beta" className="inicio__seccion">
        <div className="inicio__beta">
          <h2>Únete a la beta</h2>
          <p className="inicio__lead">Las dos apps están en prueba cerrada en Google Play. Son dos pasos:</p>
          <ol className="inicio__beta-pasos">
            <li>Únete al grupo con tu cuenta de Google: <a href={GRUPO} target="_blank" rel="noreferrer">grupo cargaexpress-beta</a></li>
            <li>Abre el enlace de la app que necesitas y descárgala desde Play.</li>
          </ol>
          <div className="inicio__ctas">
            <a href={PLAY_CLIENTE} target="_blank" rel="noreferrer" className="inicio__btn"><Package size={18} />CargaExpress (cliente)</a>
            <a href={PLAY_CONDUCTOR} target="_blank" rel="noreferrer" className="inicio__btn inicio__btn--ghost"><Truck size={18} />CargaExpress Conductor</a>
          </div>
        </div>
      </section>

      <section id="contacto" className="inicio__seccion">
        <span className="inicio__ceja">Contacto</span>
        <h2>Hablemos</h2>
        <p className="inicio__lead">¿Tienes dudas, quieres ser conductor o tienes un negocio con envíos frecuentes? Escríbenos.</p>
        <a href={`mailto:${CONTACTO}`} className="inicio__correo"><Mail size={22} />{CONTACTO}</a>
      </section>

      <footer className="inicio__pie">
        <span className="inicio__brand"><span className="inicio__logo"><Truck size={18} /></span>Carga Express</span>
        <nav>
          <Link to="/privacidad">Privacidad</Link>
          <Link to="/terminos">Términos</Link>
          <Link to="/eliminar-cuenta">Eliminar cuenta</Link>
        </nav>
        <p>© {new Date().getFullYear()} Carga Express</p>
      </footer>
    </div>
  );
}
