import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@drivn-cook/shared';
import { Menu, Grid2X2 } from 'lucide-react';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import AppLauncher from '../components/AppLauncher';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);

  return (
    <div
      className="min-h-screen grid"
      style={{ gridTemplateColumns: collapsed ? '4rem 1fr' : '16rem 1fr' }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
      />

      <div className="flex flex-col">
        <header className="px-4 py-3 border-b flex items-center gap-2 sticky top-0 bg-white/70 backdrop-blur z-10">
          {/* Burger (mobile) */}
          <button
            className="md:hidden p-2 rounded hover:bg-black/5"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="font-medium">DRIVN-COOK — Back Office</Link>

          {/* Launcher accessible partout */}
          <button
            className="ml-auto p-2 rounded hover:bg-black/5"
            onClick={() => setLauncherOpen(true)}
            aria-label="Ouvrir le lanceur"
            title="Ouvrir le lanceur"
          >
            <Grid2X2 size={20} />
          </button>

          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden sm:inline">
                {user.email} — {user.role}
              </span>
              <button onClick={logout} className="underline">Se déconnecter</button>
            </div>
          )}
        </header>

        <main className="flex-1 p-4">
          <Outlet />
        </main>

        <footer className="px-4 py-3 border-t text-xs opacity-70">© DRIVN-COOK</footer>
      </div>

      {/* Panneau du launcher */}
      <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </div>
  );
}
