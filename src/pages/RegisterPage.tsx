import { RegisterForm } from '@drivn-cook/shared';
import { useAuth } from '@drivn-cook/shared';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  return (
    <div>
      <h1>Créer un compte</h1>
      <RegisterForm onSubmit={async (p) => {
        await register(p);
        nav('/');
      }}/>
    </div>
  );
}
