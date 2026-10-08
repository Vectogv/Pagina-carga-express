import {
  LayoutDashboard, Users, Handshake, Truck, ShieldCheck, Route, TrendingUp, BadgeCheck,
  Flag, Scale, Siren, CircleX, CreditCard, Megaphone, ChartColumn, Pin, MessagesSquare,
  ClipboardList, Settings, DatabaseBackup, UserRound, BedDouble, UsersRound, LifeBuoy,
  CalendarClock, Gavel, ChartLine, Send, ListChecks, MapPinned, Gift, Building2,
} from 'lucide-react';

// Navegación agrupada. Cada item: { icon, label, to, end? }
// Admin: ordenado por tarea, primero lo que espera una decisión. Las etiquetas son las
// mismas que el título de cada página (el Header muestra la etiqueta del menú).
export const adminNav = [
  {
    items: [{ icon: LayoutDashboard, label: 'Inicio', to: '/admin', end: true }],
  },
  {
    title: 'Requiere atención',
    items: [
      { icon: ListChecks, label: 'Pendientes de moderadores', to: '/admin/pendientes' },
      { icon: Siren, label: 'Emergencias', to: '/admin/emergencies' },
      { icon: Scale, label: 'Disputas', to: '/admin/disputes' },
      { icon: CircleX, label: 'Solicitudes de cancelación', to: '/admin/cancellation-requests' },
      { icon: LifeBuoy, label: 'Tickets de soporte', to: '/admin/tickets' },
      { icon: Flag, label: 'Reportes entre usuarios', to: '/admin/reports' },
    ],
  },
  {
    title: 'Personas',
    items: [
      { icon: Users, label: 'Usuarios', to: '/admin/users' },
      { icon: Handshake, label: 'Clientes', to: '/admin/clients' },
      { icon: Truck, label: 'Conductores', to: '/admin/drivers' },
      { icon: MapPinned, label: 'Mapa de conductores', to: '/admin/mapa-conductores' },
      { icon: Gift, label: 'Referidos', to: '/admin/referidos' },
      { icon: BadgeCheck, label: 'Verificaciones', to: '/admin/verifications' },
      { icon: Building2, label: 'Empresas', to: '/admin/empresas' },
      { icon: ShieldCheck, label: 'Moderadores', to: '/admin/moderators' },
      { icon: ClipboardList, label: 'Reportes de moderadores', to: '/admin/moderator-reports' },
    ],
  },
  {
    title: 'Operación',
    items: [
      { icon: Route, label: 'Viajes', to: '/admin/trips' },
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

// Ordenado por urgencia, igual que la app: primero lo que requiere acción del moderador.
export const moderatorNav = [
  {
    items: [{ icon: LayoutDashboard, label: 'Centro de control', to: '/moderator', end: true }],
  },
  {
    title: 'Requiere atención',
    items: [
      { icon: Siren, label: 'Emergencias', to: '/moderator/emergencies' },
      { icon: Gavel, label: 'Cierres por resolver', to: '/moderator/cierres' },
      { icon: LifeBuoy, label: 'Tickets de soporte', to: '/moderator/tickets' },
    ],
  },
  {
    title: 'Operación',
    items: [
      { icon: Route, label: 'Viajes', to: '/moderator/trips' },
      { icon: CalendarClock, label: 'Reservas', to: '/moderator/reservations' },
    ],
  },
  {
    title: 'Conductores',
    items: [
      { icon: Truck, label: 'Verificación de conductores', to: '/moderator/drivers', end: true },
      { icon: BedDouble, label: 'Conductores inactivos', to: '/moderator/drivers/inactive' },
      { icon: Flag, label: 'Mis reportes', to: '/moderator/reports' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { icon: MessagesSquare, label: 'Conversatorio', to: '/moderator/conversations' },
      { icon: UsersRound, label: 'Directorio', to: '/moderator/companeros' },
      { icon: Pin, label: 'Avisos', to: '/moderator/avisos' },
      { icon: Megaphone, label: 'Comunicados', to: '/moderator/comunicados' },
      { icon: ChartColumn, label: 'Encuestas', to: '/moderator/encuestas' },
    ],
  },
  {
    title: 'Cuenta',
    items: [{ icon: UserRound, label: 'Mi perfil', to: '/moderator/profile' }],
  },
];

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
