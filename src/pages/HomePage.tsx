// src/pages/HomePage.tsx
import { navSections } from '../../src/nav'; // ajuste si ton alias diffère
import { Link } from 'react-router-dom';
import { useAuth } from '@drivn-cook/shared';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Accueil</h1>
        {user && (
          <p className="text-sm opacity-70">
            Connecté en tant que <b>{user.email}</b> ({user.role})
          </p>
        )}
      </div>

      {/* GRID DE TUILES */}
      <div className="border rounded-2xl p-4">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="mb-6 last:mb-0">
            {section.title && (
              <div className="uppercase text-[0.7rem] opacity-60 mb-2">{section.title}</div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {section.items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  className="group border rounded-xl p-4 hover:bg-black/5 transition-colors flex items-center gap-3"
                >
                  <it.icon size={20} />
                  <div className="font-medium group-hover:underline">{it.label}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
