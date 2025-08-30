import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@drivn-cook/shared';
import Sidebar from '../components/Sidebar';

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: '16rem 1fr' }}>
      <Sidebar />
      <div className="flex flex-col">
        <header className="px-4 py-3 border-b flex items-center gap-4">
          <Link to="/" className="font-medium">DRIVN‑COOK — Back Office</Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user && (
              <>
                <span>{user.email} — {user.role}</span>
                <button onClick={logout} className="underline">Se déconnecter</button>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
        <footer className="px-4 py-3 border-t text-xs opacity-70">© DRIVN‑COOK</footer>
      </div>
    </div>
  );
}
