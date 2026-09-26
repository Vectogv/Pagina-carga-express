import {
  LayoutDashboard, Users, Handshake, Truck, ShieldCheck, Route, Wallet, TrendingUp, BadgeCheck,
  Flag, Scale, Siren, CircleX, CreditCard, Megaphone, ChartColumn, Pin, MessagesSquare,
  ClipboardList, Settings, DatabaseBackup, UserRound, BedDouble, UsersRound, Bell, LifeBuoy,
} from 'lucide-react';

// Navegación agrupada. Cada item: { icon, label, to, end? }
export const adminNav = [
  {
    items: [{ icon: LayoutDashboard, label: 'Dashboard', to: '/admin', end: true }],
  },
  {
    title: 'Personas',
    items: [
      { icon: Users, label: 'Usuarios', to: '/admin/users' },
      { icon: Handshake, label: 'Clientes', to: '/admin/clients' },
      { icon: Truck, label: 'Conductores', to: '/admin/drivers' },
      { icon: ShieldCheck, label: 'Moderadores', to: '/admin/moderators' },
      { icon: BadgeCheck, label: 'Verificaciones', to: '/admin/verifications' },
    ],
  },
  {
    title: 'Operación',
    items: [
      { icon: Route, label: 'Viajes', to: '/admin/trips' },
      { icon: Siren, label: 'Emergencias', to: '/admin/emergencies' },
      { icon: Scale, label: 'Disputas', to: '/admin/disputes' },
      { icon: CircleX, label: 'Cancelaciones', to: '/admin/cancellation-requests' },
      { icon: Flag, label: 'Reportes', to: '/admin/reports' },
      { icon: LifeBuoy, label: 'Tickets de soporte', to: '/admin/tickets' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { icon: Wallet, label: 'Ganancias', to: '/admin/earnings' },
      { icon: TrendingUp, label: 'Comisiones', to: '/admin/commissions' },
      { icon: CreditCard, label: 'Pagos', to: '/admin/payments' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { icon: Megaphone, label: 'Comunicados', to: '/admin/comunicados' },
      { icon: ChartColumn, label: 'Encuestas', to: '/admin/encuestas' },
      { icon: Pin, label: 'Avisos', to: '/admin/avisos' },
      { icon: MessagesSquare, label: 'Conversatorio', to: '/admin/conversations' },
      { icon: ClipboardList, label: 'Reportes de moderación', to: '/admin/moderator-reports' },
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
    items: [{ icon: LayoutDashboard, label: 'Centro de control', to: '/moderator', end: true }],
  },
  {
    title: 'Operación',
    items: [
      { icon: Route, label: 'Viajes', to: '/moderator/trips' },
      { icon: Siren, label: 'Emergencias', to: '/moderator/emergencies' },
      { icon: LifeBuoy, label: 'Tickets de soporte', to: '/moderator/tickets' },
    ],
  },
  {
    title: 'Conductores',
    items: [
      { icon: Truck, label: 'Conductores', to: '/moderator/drivers', end: true },
      { icon: BedDouble, label: 'Inactivos', to: '/moderator/drivers/inactive' },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { icon: MessagesSquare, label: 'Conversatorio', to: '/moderator/conversations' },
      { icon: UsersRound, label: 'Compañeros', to: '/moderator/companeros' },
      { icon: Pin, label: 'Avisos', to: '/moderator/avisos' },
      { icon: Megaphone, label: 'Comunicados', to: '/moderator/comunicados' },
      { icon: ChartColumn, label: 'Encuestas', to: '/moderator/encuestas' },
      { icon: Bell, label: 'Mis reportes', to: '/moderator/reports' },
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
