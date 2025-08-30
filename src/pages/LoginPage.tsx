// src/pages/LoginPage.tsx
import { LoginForm, useAuth } from '@drivn-cook/shared';
import { useLocation, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/';

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Connexion</h1>
      <LoginForm
        onSubmit={async (email: string, password: string) => {
          await login(email, password);
          nav(from, { replace: true });
        }}
      />
    </div>
  );
}
