import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, MapPin, Tag, Navigation, BadgeCheck, Headset, Package, CalendarClock, Search, Handshake,
  KeyRound, Mail, ChevronDown, Menu, ArrowRight, User, Quote, Star, MessageCircle,
} from 'lucide-react';
import Marca from '../components/Marca/Marca';
import './Inicio.css';

const CONTACTO = 'cargaexpressgv@gmail.com';
const GRUPO = 'https://groups.google.com/g/cargaexpress-beta';
const PLAY_CLIENTE = 'https://play.google.com/apps/testing/co.cargaexpress.app';
const PLAY_CONDUCTOR = 'https://play.google.com/apps/testing/co.cargaexpress.conductor';

const MENU = [
  ['inicio', 'Inicio'], ['como-funciona', 'Cómo funciona'], ['servicios', 'Servicios'],
  ['conductores', 'Conductores'], ['preguntas', 'Preguntas frecuentes'],
];

const CONFIANZA = [
  [MapPin, 'Transporte local', 'Conductores de tu zona'],
  [Navigation, 'Seguimiento', 'GPS en vivo'],
  [BadgeCheck, 'Conductores', 'Verificados'],
  [Headset, 'Atención', 'Soporte y botón SOS'],
];

const PASOS = [
  [MapPin, 'Solicita', 'Indica origen, destino y tipo de carga.'],
  [Search, 'Encuentra', 'Conductores disponibles reciben tu solicitud.'],
  [Handshake, 'Coordina', 'Selecciona la opción que mejor se adapte a tu necesidad.'],
  [Navigation, 'Transporta', 'Realiza el seguimiento de tu servicio.'],
];

const SERVICIOS = [
  [Package, 'Transporte de carga', 'Solicita transporte para mercancía de forma sencilla.'],
  [MapPin, 'Transporte local', 'Conecta con conductores disponibles en tu zona.'],
  [CalendarClock, 'Servicios programados', 'Programa tus necesidades de transporte.'],
];

// WhatsApp para conductores: las condiciones (pagos, comisión) se explican por chat.
const WHATSAPP = '573022953554';
const WHATSAPP_VISIBLE = '302 295 3554';
const WHATSAPP_CONDUCTOR = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, quiero ser conductor de Carga Express. ¿Me cuentan cómo funciona?')}`;

const BENEFICIOS_CONDUCTOR = [
  [MapPin, 'Viajes a menos de 20 km de donde estás'],
  [Handshake, 'Tú eliges los viajes y ofertas tu precio'],
  [BadgeCheck, 'Te verificamos y activamos tu cuenta'],
];

const PREGUNTAS = [
  ['¿Quién pone el precio?', 'Tú. Publicas el envío con lo que quieres pagar y los conductores cercanos te hacen ofertas. Eliges la que prefieras.'],
  ['¿Cómo sé que mi carga llegó?', 'El conductor no puede cerrar el viaje sin tu PIN de 4 dígitos. Si recibe otra persona, le compartes el PIN.'],
  ['¿Puedo programar un envío?', 'Sí. Puedes reservar un envío para otra fecha y hora.'],
  ['¿Qué pasa si hay un problema?', 'Usa el botón SOS durante el viaje o abre un ticket de soporte. Los moderadores de tu zona median en las disputas.'],
  ['¿Cuánto cobra CargaExpress al conductor?', `Escríbenos por WhatsApp al ${WHATSAPP_VISIBLE} y te explicamos cómo funcionan los pagos y todo lo que necesitas para empezar.`],
  ['¿Qué necesito para ser conductor?', 'Ser mayor de 18 años, tener tu vehículo en buen estado y subir tus documentos para que el equipo los verifique.'],
  ['¿Cómo descargo la app?', 'Estamos en beta cerrada: únete al grupo de Google y luego abre el enlace de prueba de la app que necesitas.'],
];

// Lo que la plataforma garantiza, cada frase respaldada por una función real de la app.
const PROMESAS = [
  [KeyRound, 'Tu viaje sale bien, de principio a fin', 'El conductor no puede cerrar el viaje sin tu PIN de entrega: la carga solo se da por entregada cuando tú lo confirmas.'],
  [Navigation, 'Un viaje monitoreado en todo momento', 'Sigues al conductor en vivo en el mapa, desde la app o la web, y los moderadores de tu zona están atentos.'],
  [Handshake, 'Una experiencia simple', 'Publicas tu envío, eliges la oferta que te sirve y listo. Si algo pasa, soporte te responde por ticket.'],
];

// Solo opiniones REALES, con permiso de la persona. Vacío = se muestra la invitación.
// Forma: { nombre: 'Laura G.', rol: 'Cliente', ciudad: 'Popayán', estrellas: 5, texto: '…' }
const TESTIMONIOS = [];

// Las zonas vienen en minúscula y sin tilde desde la configuración del backend.
const NOMBRE_CIUDAD = { popayan: 'Popayán' };
const nombreCiudad = (z) =>
  NOMBRE_CIUDAD[z.clave] || String(z.nombre || z.clave).replace(/\b\w/g, (c) => c.toUpperCase());

/** Cobertura explicada en 3 puntos. Ciudades y radio salen en vivo de la configuración del panel. */
function Cobertura() {
  const [zonas, setZonas] = useState([{ clave: 'popayan', nombre: 'popayan', radio: 40 }]);
  useEffect(() => {
    let vigente = true;
    fetch('/api/config/coverage')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vigente && d?.zonas?.length) setZonas(d.zonas); })
      .catch(() => {});
    return () => { vigente = false; };
  }, []);

  return (
    <ul className="inicio__cobertura">
      <li>
        <span className="inicio__icono"><MapPin size={20} /></span>
        <div>
          <strong>Dónde operamos</strong>
          <ul className="inicio__ciudades">
            {zonas.map((z) => <li key={z.clave}><span className="inicio__punto" />{nombreCiudad(z)}<small>Activa</small></li>)}
          </ul>
        </div>
      </li>
      <li>
        <span className="inicio__icono"><Navigation size={20} /></span>
        <div>
          <strong>Quién recibe tu envío</strong>
          <p>Los conductores que están a menos de 20 km del punto de recogida. Por eso llegan rápido.</p>
        </div>
      </li>
      <li>
        <span className="inicio__icono"><Truck size={20} /></span>
        <div>
          <strong>Hasta dónde llevamos</strong>
          <p>
            Recogemos y entregamos dentro de la zona de cada ciudad
            {zonas[0]?.radio ? `: unos ${Math.round(zonas[0].radio)} km a la redonda de ${nombreCiudad(zonas[0])}` : ''}.
          </p>
        </div>
      </li>
    </ul>
  );
}

const MOCKUPS = [
  ['cliente_1', 'Inicio de la app del cliente'],
  ['cliente_3', 'Oferta recibida de un conductor'],
  ['conductor_2', 'Ruta del conductor hasta la entrega'],
];

const RUTA = 'M38 262 C 60 222, 58 196, 104 178 S 176 150, 182 112 S 206 62, 226 44';

// Inclinación 3D de tarjetas con el mouse (solo puntero fino; en celular no corre)
function inclinar(e) {
  if (e.pointerType !== 'mouse') return;
  const c = e.target.closest?.('.inclina');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 10}deg`);
  c.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`);
}

function soltar(e) {
  const c = e.target.closest?.('.inclina');
  if (c && !c.contains(e.relatedTarget)) {
    c.style.removeProperty('--rx');
    c.style.removeProperty('--ry');
  }
}

// El camión gira un poco siguiendo el mouse
function girarCamion(e) {
  if (e.pointerType !== 'mouse') return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--gy', `${((e.clientX - r.left) / r.width - 0.5) * 36}deg`);
}

// Calles de un mapa estilizado (no es un plano real)
const Calles = () => (
  <g>
    <rect width="260" height="300" fill="var(--mapa)" />
    <path d="M150 0 C 140 80, 200 140, 170 300" stroke="var(--rio)" strokeWidth="14" fill="none" />
    <rect x="22" y="40" width="70" height="52" rx="6" fill="var(--parque)" />
    <rect x="196" y="190" width="52" height="64" rx="6" fill="var(--parque)" />
    <g stroke="var(--calle)" strokeWidth="7">
      {[30, 95, 160, 225, 290].map((y) => <line key={y} x1="0" y1={y} x2="260" y2={y - 24} />)}
      {[18, 84, 128, 200, 246].map((x) => <line key={x} x1={x} y1="0" x2={x + 18} y2="300" />)}
    </g>
  </g>
);

// Camioncito del mapa (SVG), centrado en 0,0.
const Camioncito = ({ x, y, clase = '' }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className={clase}>
      <rect x="-11" y="-7" width="22" height="14" rx="4" fill="var(--azul-noche)" stroke="#fff" strokeWidth="2" />
      <rect x="3" y="-4" width="5" height="8" rx="1" fill="var(--naranja)" />
    </g>
  </g>
);

// Ofertas de ejemplo de la interfaz (ilustración de la pantalla, no son opiniones).
const OFERTAS_DEMO = [['CR', 'Furgón · llega en 6 min', '$ 42.000', 4.9], ['AM', 'Estacas · llega en 9 min', '$ 45.000', 4.7], ['JP', 'Camioneta · llega en 12 min', '$ 48.000', 4.8]];

/** Pantalla de la app que corresponde a cada paso de "Cómo funciona". */
function Pantalla({ paso }) {
  if (paso === 0) {
    return (
      <div className="mock__pantalla mock__form">
        <small>Nuevo envío</small>
        <div className="mock__campo"><i className="mock__dot" /><span><em>Origen</em>Parque Caldas</span></div>
        <div className="mock__campo"><i className="mock__dot mock__dot--b" /><span><em>Destino</em>C.C. Campanario</span></div>
        <em className="mock__etiqueta">Vehículo</em>
        <div className="mock__chips"><b className="activo">Furgón</b><b>Estacas</b><b>Camioneta</b></div>
        <div className="mock__precio"><em>Tu precio</em><strong>$ 45.000</strong></div>
        <b className="mock__accion">Publicar envío</b>
      </div>
    );
  }
  if (paso === 1) {
    return (
      <div className="mock__pantalla">
        <svg className="mock__mapa" viewBox="0 0 260 300">
          <Calles />
          <circle cx="130" cy="150" r="78" fill="var(--azul)" fillOpacity="0.1" stroke="var(--azul)" strokeDasharray="5 6" />
          <circle cx="130" cy="150" r="20" className="inicio__pulso" fill="var(--azul)" />
          <circle cx="130" cy="150" r="8" fill="var(--azul)" stroke="#fff" strokeWidth="3" />
          <Camioncito x={74} y={104} clase="mock__bote" />
          <Camioncito x={196} y={124} clase="mock__bote mock__bote--2" />
          <Camioncito x={150} y={222} clase="mock__bote mock__bote--3" />
        </svg>
        <div className="mock__tarjeta">
          <small>Buscando conductores</small>
          <strong>3 conductores a menos de 20 km</strong>
          <i className="mock__cargando" />
        </div>
      </div>
    );
  }
  if (paso === 2) {
    return (
      <div className="mock__pantalla mock__ofertas">
        <small>Ofertas recibidas</small>
        {OFERTAS_DEMO.map(([ini, det, precio, cal], i) => (
          <div key={ini} className={`mock__oferta ${i === 0 ? 'elegida' : ''}`}>
            <span className="mock__avatar">{ini}</span>
            <span className="mock__oferta-info"><strong>{precio}</strong>{det}</span>
            <span className="mock__cal">★ {cal}</span>
            {i === 0 && <b className="mock__accion">Aceptar oferta</b>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mock__pantalla">
      <svg className="mock__mapa" viewBox="0 0 260 300">
        <Calles />
        <path id="ruta-mock" d={RUTA} stroke="var(--azul)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d={RUTA} className="mock__ruta-viva" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="6 10" />
        <circle cx="38" cy="262" r="8" fill="var(--azul)" stroke="#fff" strokeWidth="3" />
        <path d="M226 44 m-10 -18 a10 10 0 1 1 20 0 c0 8 -10 18 -10 18 s-10 -10 -10 -18z" transform="translate(0 18)" fill="var(--naranja)" />
        <g>
          <rect x="-11" y="-7" width="22" height="14" rx="4" fill="var(--azul-noche)" stroke="#fff" strokeWidth="2" />
          <rect x="3" y="-4" width="5" height="8" rx="1" fill="var(--naranja)" />
          <animateMotion dur="7s" repeatCount="indefinite" rotate="auto"><mpath href="#ruta-mock" /></animateMotion>
        </g>
      </svg>
      <div className="mock__tarjeta">
        <small>En camino · en vivo</small>
        <strong>Tu carga llega en 18 min</strong>
        <span className="mock__pin">PIN de entrega <b>• • • •</b></span>
      </div>
    </div>
  );
}

function Mockup({ paso }) {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock__telefono">
        <div className="mock__app"><img src="/logo.png" alt="" width="18" height="18" className="mock__logo" />CargaExpress</div>
        <div key={paso} className="mock__cambio"><Pantalla paso={paso} /></div>
      </div>
    </div>
  );
}

const DURACION_PASO = 4500;

/** Pasos que avanzan solos y cambian la pantalla del celular; al tocar uno se detiene. */
function ComoFunciona() {
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setPaso((p) => (p + 1) % PASOS.length), DURACION_PASO);
    return () => clearInterval(id);
  }, [auto]);

  return (
    <div className="inicio__funciona">
      <div>
        <span className="inicio__ceja">Cómo funciona</span>
        <h2>De la solicitud a la entrega</h2>
        <p className="inicio__lead">Así se ve en la app, paso a paso.</p>
        <ol className="inicio__pasos">
          {PASOS.map(([Icono, t, d], i) => (
            <li key={t}>
              <button
                type="button"
                className={`inicio__paso ${i === paso ? 'is-activo' : ''} ${i < paso ? 'is-hecho' : ''}`}
                aria-current={i === paso ? 'step' : undefined}
                onClick={() => { setPaso(i); setAuto(false); }}
              >
                <span className="inicio__paso-icono"><Icono size={20} /></span>
                <span className="inicio__paso-texto"><strong>{t}</strong><span>{d}</span></span>
                {i === paso && auto && <i key={paso} className="inicio__paso-barra" style={{ animationDuration: `${DURACION_PASO}ms` }} />}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <Mockup paso={paso} />
    </div>
  );
}

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
          {[22, 128, 204].map((x) => <b key={`l${x}`} className="camion__rueda camion__rueda--lejos" style={{ left: x }} />)}
          <Caja className="camion__chasis" />
          <Caja className="camion__carga"><span>CARGA EXPRESS</span></Caja>
          <Caja className="camion__cabina" />
          <Caja className="camion__parachoque" />
          <Caja className="camion__espejo camion__espejo--cerca" />
          <Caja className="camion__espejo camion__espejo--lejos" />
          {[22, 128, 204].map((x) => <b key={x} className="camion__rueda" style={{ left: x }} />)}
        </div>
      </div>
    </div>
  );
}

const Telefono = ({ c, alt }) => (
  <img
    src={`/capturas/captura_${c}.jpg`} srcSet={`/capturas/captura_${c}.jpg 540w, /capturas/captura_${c}_hd.jpg 1080w`}
    sizes="(max-width: 420px) 85vw, 320px" alt={alt} width="540" height="960" loading="lazy" decoding="async"
    className="inicio__telefono"
  />
);

export default function Inicio() {
  return (
    <div className="inicio" onPointerMove={inclinar} onPointerOut={soltar}>
      <header className="inicio__top">
        <a href="#inicio" className="inicio__brand" aria-label="Carga Express, ir al inicio"><Marca /></a>
        <nav className="inicio__nav">{MENU.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</nav>
        <details className="inicio__menu">
          <summary aria-label="Menú"><Menu size={22} /></summary>
          <nav onClick={(e) => e.target.closest('a') && e.currentTarget.parentElement.removeAttribute('open')}>
            {MENU.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}
            <Link to="/ingresar">Ingresar</Link>
          </nav>
        </details>
        <Link to="/ingresar" className="inicio__ingresar" aria-label="Ingresar"><User size={16} /><span>Ingresar</span></Link>
        <a href="#solicitar" className="inicio__btn inicio__btn--sm">Solicitar servicio</a>
        <div className="inicio__progreso" aria-hidden="true"><span><Truck size={14} /></span></div>
      </header>

      <section id="inicio" className="inicio__hero" onPointerMove={girarCamion}>
        <div className="inicio__piso" aria-hidden="true"><div /></div>
        <div className="inicio__hero-texto">
          <span className="inicio__tag">Hecho en Popayán · Beta en Android</span>
          <h1>Mueve tu carga<i>.</i><br /><em>Más fácil<i>.</i> Más rápido<i>.</i></em></h1>
          <p>Conecta con conductores de Carga Express y solicita servicios de transporte desde una plataforma diseñada para simplificar cada viaje.</p>
          <div className="inicio__ctas">
            <a href="#solicitar" className="inicio__btn"><Package size={18} />Solicitar transporte</a>
            <a href="#como-funciona" className="inicio__btn inicio__btn--claro">Conocer Carga Express</a>
          </div>
        </div>
        <div className="inicio__hero-visual">
          <Camion3D />
          <div className="inicio__chip inicio__chip--1"><Tag size={16} />Nueva oferta · $ 42.000</div>
          <div className="inicio__chip inicio__chip--2"><Navigation size={16} />Conductor a 4 min</div>
          <div className="inicio__chip inicio__chip--3"><KeyRound size={16} />Entregado con PIN</div>
        </div>
      </section>

      <ul className="inicio__confianza">
        {CONFIANZA.map(([Icono, t, d]) => (
          <li key={t}><span className="inicio__icono"><Icono size={20} /></span><span><strong>{t}</strong>{d}</span></li>
        ))}
      </ul>

      <section id="como-funciona" className="inicio__seccion">
        <ComoFunciona />
      </section>

      <section id="servicios" className="inicio__seccion">
        <span className="inicio__ceja">Servicios</span>
        <h2>Lo que puedes mover con nosotros</h2>
        <ul className="inicio__servicios">
          {SERVICIOS.map(([Icono, t, d]) => (
            <li key={t} className="inicio__card inclina revela">
              <Icono className="inicio__card-fondo" size={150} strokeWidth={1} aria-hidden="true" />
              <span className="inicio__icono inicio__icono--grande"><Icono size={26} /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="app" className="inicio__seccion">
        <span className="inicio__ceja">La app</span>
        <h2>Todo el servicio desde una sola aplicación.</h2>
        <div className="inicio__escenario">
          <div className="inicio__mockups">
            {MOCKUPS.map(([c, alt]) => <Telefono key={c} c={c} alt={alt} />)}
          </div>
        </div>
      </section>

      <section id="conductores" className="inicio__banda">
        <div className="inicio__banda-in">
          <div>
            <span className="inicio__ceja">Para conductores</span>
            <h2>¿Eres conductor?</h2>
            <p>Únete a Carga Express y encuentra nuevas oportunidades de trabajo. Eliges los viajes que te sirven y ofertas tu precio.</p>
            <a href={PLAY_CONDUCTOR} target="_blank" rel="noreferrer" className="inicio__btn"><Truck size={18} />Quiero ser conductor</a>
            <small className="inicio__nota">Beta cerrada: primero únete al <a href={GRUPO} target="_blank" rel="noreferrer">grupo de prueba</a> con tu cuenta de Google.</small>
          </div>
          <div className="inicio__wa inclina">
            <span className="inicio__wa-icono"><MessageCircle size={26} /></span>
            <h3>¿Quieres saber cuánto puedes ganar?</h3>
            <p>Escríbenos por WhatsApp y te explicamos todo: cómo funcionan los pagos, qué documentos necesitas y cómo empezar.</p>
            <ul>
              {BENEFICIOS_CONDUCTOR.map(([Icono, t]) => <li key={t}><Icono size={18} />{t}</li>)}
            </ul>
            <a href={WHATSAPP_CONDUCTOR} target="_blank" rel="noreferrer" className="inicio__btn inicio__btn--wa">
              <MessageCircle size={18} />Escribir por WhatsApp
            </a>
            <small>WhatsApp {WHATSAPP_VISIBLE}</small>
          </div>
        </div>
      </section>
      <div className="inicio__cinta" aria-hidden="true" />

      <section id="cobertura" className="inicio__seccion">
        <div className="inicio__split">
          <div>
            <span className="inicio__ceja">Cobertura</span>
            <h2>Locales en Popayán, con mirada nacional</h2>
            <p className="inicio__lead">Nacimos en Popayán y trabajamos con conductores de aquí, que conocen sus calles. Así funciona la cobertura:</p>
            <Cobertura />
          </div>
          <svg className="inicio__mapa inclina" viewBox="0 0 260 300" role="img" aria-label="Mapa estilizado de Popayán">
            <Calles />
            <circle cx="130" cy="150" r="96" fill="var(--azul)" fillOpacity="0.08" stroke="var(--azul)" strokeWidth="1.5" strokeDasharray="5 6" className="inicio__radio" />
            <circle cx="130" cy="150" r="22" className="inicio__pulso" fill="var(--naranja)" />
            <circle cx="130" cy="150" r="9" fill="var(--naranja)" stroke="#fff" strokeWidth="3" />
            <rect x="92" y="176" width="76" height="24" rx="12" fill="var(--azul-noche)" />
            <text x="130" y="192" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">Popayán</text>
            <rect x="160" y="62" width="88" height="22" rx="11" fill="#fff" stroke="var(--azul)" />
            <text x="204" y="77" textAnchor="middle" fill="var(--azul)" fontSize="10" fontWeight="700">Radio de 20 km</text>
          </svg>
        </div>
      </section>

      <section id="opiniones" className="inicio__seccion">
        <span className="inicio__ceja">La experiencia</span>
        <h2>Así se vive un viaje con Carga Express</h2>
        <ul className="inicio__promesas">
          {PROMESAS.map(([Icono, frase, porque]) => (
            <li key={frase} className="inicio__card inclina revela">
              <span className="inicio__icono inicio__icono--grande"><Icono size={24} /></span>
              <strong>{frase}</strong>
              <p>{porque}</p>
            </li>
          ))}
        </ul>

        {TESTIMONIOS.length > 0 && <h3 className="inicio__opiniones-titulo">Opiniones de usuarios</h3>}
        {TESTIMONIOS.length > 0 && (
          <ul className="inicio__opiniones">
            {TESTIMONIOS.map((t) => (
              <li key={`${t.nombre}-${t.texto.slice(0, 20)}`} className="inicio__card inclina revela">
                <Quote size={26} className="inicio__comillas" aria-hidden="true" />
                {t.estrellas > 0 && (
                  <span className="inicio__estrellas" aria-label={`${t.estrellas} de 5 estrellas`}>
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} fill={i < t.estrellas ? 'currentColor' : 'none'} aria-hidden="true" />)}
                  </span>
                )}
                <blockquote>{t.texto}</blockquote>
                <p className="inicio__autor"><strong>{t.nombre}</strong>{t.rol} · {t.ciudad}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="preguntas" className="inicio__seccion">
        <div className="inicio__faq-grid">
          <div className="inicio__faq-intro">
            <span className="inicio__ceja">Preguntas frecuentes</span>
            <h2>Resolvemos tus dudas</h2>
            <p className="inicio__lead">¿No encuentras tu respuesta? Escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a></p>
          </div>
          <div>
            {PREGUNTAS.map(([p, r]) => (
              <details key={p} className="inicio__card inicio__faq">
                <summary>{p}<ChevronDown size={18} /></summary>
                <p>{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="solicitar" className="inicio__seccion">
        <div className="inicio__final">
          <h2>¿Necesitas transportar algo?</h2>
          <p className="inicio__lead">Solicita tu servicio desde Carga Express.</p>
          <a href={PLAY_CLIENTE} target="_blank" rel="noreferrer" className="inicio__btn">Solicitar transporte<ArrowRight size={18} /></a>
          <small className="inicio__nota">La app está en beta cerrada en Google Play. Antes de descargarla, únete al <a href={GRUPO} target="_blank" rel="noreferrer">grupo de prueba</a> con tu cuenta de Google.</small>
        </div>
      </section>

      <footer className="inicio__pie">
        <div className="inicio__pie-in">
          <div className="inicio__pie-marca">
            <span className="inicio__brand"><Marca oscura /></span>
            <p>Transporte que conecta.</p>
            <small><MapPin size={14} />Popayán, Cauca</small>
          </div>
          <nav aria-label="Navegación">
            <h4>Navegación</h4>
            {MENU.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}
          </nav>
          <nav aria-label="Legal">
            <h4>Legal</h4>
            <Link to="/privacidad">Privacidad</Link>
            <Link to="/terminos">Términos</Link>
            <Link to="/eliminar-cuenta">Eliminar cuenta</Link>
          </nav>
          <div>
            <h4>Contacto</h4>
            <a href={`mailto:${CONTACTO}`}><Mail size={15} />{CONTACTO}</a>
            <a href={GRUPO} target="_blank" rel="noreferrer">Grupo de la beta</a>
          </div>
        </div>
        <div className="inicio__pie-base">© {new Date().getFullYear()} Carga Express · Hecho en Popayán</div>
      </footer>
    </div>
  );
}
