import { lazy, Suspense, useEffect, type JSX } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';

// 👉 adapte l'import selon ton shared (ex: '@drivn-cook/shared')
import { AuthProvider, useAuth, setApiBaseUrl } from '@drivn-cook/shared';
import { API_URL } from './config.js';

const HomePage = lazy(() => import('./pages/HomePage')); // ta page dashboard
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }: { children: JSX.Element }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b flex items-center gap-4">
        <Link to="/">DRIVN-COOK (Back Office)</Link>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span>{user.email} — {user.role}</span>
              <button onClick={logout}>Se déconnecter</button>
            </>
          ) : (
            <>
              <Link to="/login">Connexion</Link>
              <Link to="/register">Créer un compte</Link>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 p-4">{children}</main>
      <footer className="px-4 py-3 border-t text-sm opacity-70">© DRIVN-COOK</footer>
    </div>
  );
}

export default function App() {
  // fixe la base API du shared (dev & prod)
  useEffect(() => {
    setApiBaseUrl(API_URL);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Shell>
            <Routes>
              {/* dashboard/admin routes protégées */}
              <Route
                path="/"
                element={
                  <AdminRoute>
                    <HomePage />
                  </AdminRoute>
                }
              />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
