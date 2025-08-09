import { useAuth } from '@drivn-cook/shared';

export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <div>
      <h1>Accueil</h1>
      {user ? (
        <>
          <p>Connecté en tant que <b>{user.email}</b> ({user.role})</p>
          <button onClick={logout}>Se déconnecter</button>
        </>
      ) : <p>Non connecté</p>}
    </div>
  );
}
