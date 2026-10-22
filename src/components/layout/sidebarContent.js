import {
  LayoutDashboard, Users, Handshake, Truck, ShieldCheck, Route, TrendingUp, BadgeCheck,
  Flag, Scale, Siren, CircleX, CreditCard, Megaphone, Pin, MessagesSquare,
  ClipboardList, Settings, DatabaseBackup, UserRound, BedDouble, UsersRound, LifeBuoy,
  CalendarClock, FileWarning, Gavel, ChartLine, Send, Mail, ListChecks, MapPinned, Gift, Building2, FileSignature,
} from 'lucide-react';

// Navegación agrupada como panel de seguridad y administración. Cada item: { icon, label, to, end? }
// Regla: los conductores solo aparecen en "Conductores"; "Administración"/"Mi zona" es solo personal
// (moderadores y administración). Las etiquetas son el título que muestra el Header.
export const adminNav = [
  {
    items: [{ icon: LayoutDashboard, label: 'Inicio', to: '/admin', end: true }],
  },
  {
    title: 'Operación',
    items: [
      { icon: Route, label: 'Viajes', to: '/admin/trips' },
      { icon: MapPinned, label: 'Mapa en vivo', to: '/admin/mapa' },
      { icon: CircleX, label: 'Cancelaciones', to: '/admin/cancellation-requests' },
    ],
  },
  {
    title: 'Seguridad',
    items: [
      { icon: Siren, label: 'SOS', to: '/admin/emergencies' },
      { icon: Scale, label: 'Disputas', to: '/admin/disputes' },
      { icon: Flag, label: 'Reportes entre usuarios', to: '/admin/reports' },
    ],
  },
  {
    title: 'Conductores',
    items: [
      { icon: Truck, label: 'Conductores', to: '/admin/drivers' },
      { icon: BadgeCheck, label: 'Verificaciones', to: '/admin/verifications' },
      { icon: ClipboardList, label: 'Reportes de moderadores', to: '/admin/moderator-reports' },
      { icon: Gift, label: 'Referidos', to: '/admin/referidos' },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { icon: Handshake, label: 'Clientes', to: '/admin/clients' },
      { icon: Building2, label: 'Empresas', to: '/admin/empresas' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { icon: LifeBuoy, label: 'Tickets', to: '/admin/tickets' },
      { icon: MessagesSquare, label: 'Conversatorio', to: '/admin/conversations' },
      { icon: Megaphone, label: 'Comunicados', to: '/admin/comunicados' },
      { icon: Pin, label: 'Avisos', to: '/admin/avisos' },
      { icon: Send, label: 'Enviar comunicación', to: '/admin/comunicacion' },
      { icon: Mail, label: 'Correos', to: '/admin/correos' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { icon: CreditCard, label: 'Pagos pendientes', to: '/admin/payments' },
      { icon: TrendingUp, label: 'Comisiones', to: '/admin/commissions' },
      { icon: ChartLine, label: 'Estadísticas', to: '/admin/earnings' },
      { icon: ChartLine, label: 'Métricas', to: '/admin/metricas' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { icon: ShieldCheck, label: 'Moderadores', to: '/admin/moderators' },
      { icon: FileSignature, label: 'Solicitudes de moderadores', to: '/admin/moderadores-verificaciones' },
      { icon: ListChecks, label: 'Pendientes', to: '/admin/pendientes' },
      { icon: Users, label: 'Cuentas de usuario', to: '/admin/users' },
      { icon: Settings, label: 'Configuración', to: '/admin/config' },
      { icon: DatabaseBackup, label: 'Backups', to: '/admin/backups' },
      { icon: UserRound, label: 'Mi perfil', to: '/admin/profile' },
    ],
  },
];

export const moderatorNav = [
  {
    items: [{ icon: LayoutDashboard, label: 'Inicio de mi zona', to: '/moderator', end: true }],
  },
  {
    title: 'Operación',
    items: [
      { icon: Route, label: 'Viajes', to: '/moderator/trips' },
      { icon: CalendarClock, label: 'Reservas', to: '/moderator/reservations' },
      { icon: MapPinned, label: 'Mapa en vivo', to: '/moderator/mapa' },
    ],
  },
  {
    title: 'Seguridad',
    items: [
      { icon: Siren, label: 'SOS', to: '/moderator/emergencies' },
      { icon: Gavel, label: 'Cierres por resolver', to: '/moderator/cierres' },
      { icon: Scale, label: 'Disputas', to: '/moderator/disputes' },
    ],
  },
  {
    title: 'Conductores',
    items: [
      { icon: Truck, label: 'Directorio', to: '/moderator/conductores' },
      { icon: BadgeCheck, label: 'Por verificar', to: '/moderator/drivers', end: true },
      { icon: BedDouble, label: 'Inactivos', to: '/moderator/drivers/inactive' },
      { icon: FileWarning, label: 'Excepciones de SOAT', to: '/moderator/soat-excepciones' },
      { icon: Flag, label: 'Mis reportes', to: '/moderator/reports' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { icon: LifeBuoy, label: 'Tickets', to: '/moderator/tickets' },
      { icon: MessagesSquare, label: 'Conversaciones', to: '/moderator/conversations' },
      { icon: Megaphone, label: 'Comunicados', to: '/moderator/comunicados' },
      { icon: Pin, label: 'Avisos', to: '/moderator/avisos' },
    ],
  },
  {
    title: 'Mi zona',
    items: [
      { icon: UsersRound, label: 'Equipo de la zona', to: '/moderator/companeros' },
      { icon: FileSignature, label: 'Mi contrato', to: '/moderator/mi-contrato' },
      { icon: UserRound, label: 'Mi perfil', to: '/moderator/profile' },
    ],
  },
];

/** Perfiles navegables (/{area}/drivers/:id y /{area}/clients/:id): no están en el menú. */
export function tituloPerfil(pathname) {
  if (/^\/(admin|moderator)\/drivers\/\d+/.test(pathname)) return { group: 'Conductores', label: 'Perfil del conductor' };
  if (/^\/(admin|moderator)\/clients\/\d+/.test(pathname)) return { group: 'Clientes', label: 'Perfil del cliente' };
  return null;
}

/** Devuelve { group, label } de la ruta actual según la navegación. */
export function findNavEntry(nav, pathname) {
  let best = null;
  for (const group of nav) {
    for (const item of group.items) {
      const match = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (match && (!best || item.to.length > best.item.to.length)) best = { group: group.title, item };
    }
  }
  return best ? { group: best.group, label: best.item.label } : { group: null, label: '' };
}
