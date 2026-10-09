import {
  LayoutDashboard, Users, Handshake, Truck, ShieldCheck, Route, TrendingUp, BadgeCheck,
  Flag, Scale, Siren, CircleX, CreditCard, Megaphone, ChartColumn, Pin, MessagesSquare,
  ClipboardList, Settings, DatabaseBackup, UserRound, BedDouble, UsersRound, LifeBuoy,
  CalendarClock, Gavel, ChartLine, Send, ListChecks, MapPinned, Gift, Building2,
} from 'lucide-react';

// Navegación agrupada por tarea. Cada item: { icon, label, to, end? }
// Las etiquetas son las mismas que el título de cada página (el Header muestra la del menú).
export const adminNav = [
  {
    items: [{ icon: LayoutDashboard, label: 'Inicio', to: '/admin', end: true }],
  },
  {
    title: 'Requiere atención',
    items: [
      { icon: ListChecks, label: 'Pendientes de moderadores', to: '/admin/pendientes' },
      { icon: Siren, label: 'SOS', to: '/admin/emergencies' },
      { icon: Scale, label: 'Disputas', to: '/admin/disputes' },
      { icon: CircleX, label: 'Cancelaciones', to: '/admin/cancellation-requests' },
      { icon: LifeBuoy, label: 'Tickets', to: '/admin/tickets' },
      { icon: Flag, label: 'Reportes entre usuarios', to: '/admin/reports' },
      { icon: ClipboardList, label: 'Reportes de moderadores', to: '/admin/moderator-reports' },
    ],
  },
  {
    title: 'Personas',
    items: [
      { icon: Users, label: 'Usuarios', to: '/admin/users' },
      { icon: Handshake, label: 'Clientes', to: '/admin/clients' },
      { icon: Truck, label: 'Conductores', to: '/admin/drivers' },
      { icon: BadgeCheck, label: 'Verificaciones', to: '/admin/verifications' },
      { icon: ShieldCheck, label: 'Moderadores', to: '/admin/moderators' },
      { icon: Building2, label: 'Empresas', to: '/admin/empresas' },
      { icon: Gift, label: 'Referidos', to: '/admin/referidos' },
    ],
  },
  {
    title: 'Operación',
    items: [
      { icon: Route, label: 'Viajes', to: '/admin/trips' },
      { icon: MapPinned, label: 'Mapa en vivo', to: '/admin/mapa' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { icon: ChartLine, label: 'Estadísticas', to: '/admin/earnings' },
      { icon: TrendingUp, label: 'Comisiones', to: '/admin/commissions' },
      { icon: CreditCard, label: 'Pagos pendientes', to: '/admin/payments' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { icon: MessagesSquare, label: 'Conversatorio', to: '/admin/conversations' },
      { icon: Pin, label: 'Avisos', to: '/admin/avisos' },
      { icon: Send, label: 'Enviar comunicación', to: '/admin/comunicacion' },
      { icon: Megaphone, label: 'Comunicados', to: '/admin/comunicados' },
      { icon: ChartColumn, label: 'Encuestas', to: '/admin/encuestas' },
    ],
  },
  {
    title: 'Sistema',
    items: [
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
    title: 'Conductores',
    items: [
      { icon: Truck, label: 'Directorio', to: '/moderator/conductores' },
      { icon: BadgeCheck, label: 'Por verificar', to: '/moderator/drivers', end: true },
      { icon: BedDouble, label: 'Inactivos', to: '/moderator/drivers/inactive' },
    ],
  },
  {
    title: 'Casos',
    items: [
      { icon: Siren, label: 'SOS', to: '/moderator/emergencies' },
      { icon: Gavel, label: 'Cierres', to: '/moderator/cierres' },
      { icon: Scale, label: 'Disputas', to: '/moderator/disputes' },
      { icon: LifeBuoy, label: 'Tickets', to: '/moderator/tickets' },
      { icon: MessagesSquare, label: 'Conversaciones', to: '/moderator/conversations' },
    ],
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
    title: 'Comunicación',
    items: [
      { icon: Megaphone, label: 'Comunicados', to: '/moderator/comunicados' },
      { icon: Pin, label: 'Avisos', to: '/moderator/avisos' },
      { icon: ChartColumn, label: 'Encuestas', to: '/moderator/encuestas' },
      { icon: UsersRound, label: 'Equipo', to: '/moderator/companeros' },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { icon: Flag, label: 'Mis reportes', to: '/moderator/reports' },
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
