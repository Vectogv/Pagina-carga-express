import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import '../components/layout/Layout.css';
import { adminNav, findNavEntry } from '../components/layout/sidebarContent';

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { group, label } = findNavEntry(adminNav, pathname);

  return (
    <div className="app-shell">
      <Sidebar nav={adminNav} title="Carga Express" subtitle="Administración" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main">
        <Header section={group} title={label} onMenuToggle={() => setMenuOpen(true)} />
        <main className="app-content">
          <div className="app-centered">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
