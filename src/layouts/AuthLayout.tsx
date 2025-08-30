import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b flex items-center gap-4">
        <Link to="/" className="font-medium">DRIVN‑COOK</Link>
      </header>
      <main className="flex-1 p-4">
        <div className="max-w-md mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="px-4 py-3 border-t text-xs opacity-70">© DRIVN‑COOK</footer>
    </div>
  );
}
