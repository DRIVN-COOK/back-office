import { LoginForm } from '@drivn-cook/shared';
import { useAuth } from '@drivn-cook/shared';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  return (
    <div>
      <h1>Connexion</h1>
      <LoginForm onSubmit={async (email: string, password: string) => {
        await login(email, password);
        nav('/');
      }}/>
    </div>
  );
}
