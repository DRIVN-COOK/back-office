import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';

type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';
type Row = {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function AdminUsersPage() {
  const [q, setQ] = useState({ search: '', role: '' as '' | Role, onlyInactive: false, page: 1, pageSize: 20 });
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<Row>>('/users', {
        params: {
          search: q.search || undefined,
          role: q.role || undefined,
          inactive: q.onlyInactive || undefined,
          page: q.page,
          pageSize: q.pageSize,
        },
      });
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q.page, q.pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / q.pageSize)), [total, q.pageSize]);

  async function setRole(u: Row, role: Role) {
    await api.put(`/users/${u.id}`, { role });
    await load();
  }
  async function setActive(u: Row, active: boolean) {
    await api.put(`/users/${u.id}`, { isActive: active });
    await load();
  }
  async function resetPassword(u: Row) {
    await api.post(`/users/${u.id}`);
    alert('Si la fonctionnalité est branchée, un email de réinitialisation a été envoyé.');
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Utilisateurs</h1>
        <div className="ml-auto grid grid-cols-2 md:grid-cols-5 gap-2">
          <input value={q.search} onChange={e=>setQ(p=>({ ...p, search: e.target.value, page: 1 }))} placeholder="email / id" className="border rounded px-2 py-1 text-sm" />
          <select value={q.role} onChange={e=>setQ(p=>({ ...p, role: e.target.value as Role, page: 1 }))} className="border rounded px-2 py-1 text-sm">
            <option value="">Tous rôles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
            <option value="CUSTOMER">CUSTOMER</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={q.onlyInactive} onChange={e=>setQ(p=>({ ...p, onlyInactive: e.target.checked, page: 1 }))} />
            Inactifs seulement
          </label>
          <button onClick={()=>setQ(p=>({ ...p }))} className="border rounded px-2 py-1 text-sm">Filtrer</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Rôle</th>
              <th className="text-left px-3 py-2">Actif</th>
              <th className="text-left px-3 py-2">Créé le</th>
              <th className="text-left px-3 py-2">Dernière connexion</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <select value={u.role} onChange={e=>setRole(u, e.target.value as Role)} className="border rounded px-2 py-1">
                    <option value="ADMIN">ADMIN</option>
                    <option value="STAFF">STAFF</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button onClick={()=>setActive(u, !u.isActive)} className="underline">
                    {u.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
                <td className="px-3 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={()=>resetPassword(u)} className="underline">Reset MDP</button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucun utilisateur</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={q.page<=1} onClick={()=>setQ(p=>({ ...p, page: Math.max(1, p.page-1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {q.page} / {pages}</span>
        <button disabled={q.page>=pages} onClick={()=>setQ(p=>({ ...p, page: Math.min(pages, p.page+1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>
    </section>
  );
}
