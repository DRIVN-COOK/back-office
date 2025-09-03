import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { supplierCreateSchema, supplierUpdateSchema } from '@drivn-cook/shared';

type Row = {
  id: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  active: boolean;
  createdAt: string;
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

// util: normalise pour recherche sans accents / insensible à la casse
function norm(s: unknown) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
function matchesSupplier(s: Row, q: string) {
  if (!q) return true;
  const nq = norm(q);
  return (
    norm(s.name).includes(nq) ||
    norm(s.contactEmail).includes(nq) ||
    norm(s.contactPhone).includes(nq)
  );
}

export default function SuppliersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(''); // debounce 300ms

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // debounce recherche
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // charge les fournisseurs
  async function load() {
    setLoading(true);
    try {
      // si on recherche, on récupère "large" (1000) et page=1 pour filtrer côté client
      const wantClientFilter = debouncedQuery.trim().length > 0;
      const effectivePage = wantClientFilter ? 1 : page;
      const effectivePageSize = wantClientFilter ? 100 : pageSize;

      // on passe quand même search & q au cas où l’API les supporte
      const res = await api.get<Paged<Row>>('/suppliers', {
        params: {
          search: debouncedQuery || undefined,
          q: debouncedQuery || undefined,
          page: effectivePage,
          pageSize: effectivePageSize,
        },
      });

      const list = res.data.items ?? [];
      const totalFromApi =
        typeof res.data.total === 'number' ? res.data.total : list.length;

      // Filtre client si besoin (fallback si l’API ne filtre pas)
      const filtered = wantClientFilter ? list.filter((s) => matchesSupplier(s, debouncedQuery)) : list;

      setItems(filtered);
      setTotal(wantClientFilter ? filtered.length : totalFromApi);
    } finally {
      setLoading(false);
    }
  }

  // rechargements
  useEffect(() => {
    // si l'utilisateur tape une recherche, on revient à la page 1
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', contactEmail: '', contactPhone: '', address: '', active: true });
    setErrors({});
    setIsOpen(true);
  }
  function openEdit(s: Row) {
    setEditing(s);
    setForm({
      name: s.name,
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      address: '',
      active: s.active,
    });
    setErrors({});
    setIsOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const payload = supplierUpdateSchema.parse(form);
        await api.put(`/suppliers/${editing.id}`, payload);
      } else {
        const payload = supplierCreateSchema.parse(form);
        await api.post('/suppliers', payload);
        setPage(1);
      }
      setIsOpen(false);
      await load();
    } catch (err: unknown) {
      // ZodError côté front
      if (err && typeof err === 'object' && 'issues' in (err as any)) {
        const zerr = err as z.ZodError;
        const map: Record<string, string> = {};
        zerr.issues.forEach((issue) => {
          const key = (issue.path?.[0] ?? '') as string;
          if (key) map[key] = issue.message;
        });
        setErrors(map);
        return;
      }

      // Erreur Axios/HTTP
      const anyErr = err as any;
      const msg =
        anyErr?.response?.data?.message ||
        anyErr?.response?.data?.error ||
        anyErr?.message ||
        'Erreur de sauvegarde';
      alert(msg);
      console.error(err);
    }
  }

  // découpage pour l’affichage quand on filtre côté client
  const pagedItems = useMemo(() => {
    if (!debouncedQuery) return items; // pagination serveur, on affiche tels quels
    // pagination client si on a filtré côté client :
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, debouncedQuery]);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Fournisseurs</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (nom)"
              className="border rounded px-2 py-1 text-sm pr-6"
            />
            {query && (
              <button
                title="Effacer"
                onClick={() => setQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-1 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">
            Nouveau
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">
        {loading ? 'Chargement…' : `Total: ${total}${debouncedQuery ? ' (filtré)' : ''}`}
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Téléphone</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.contactEmail ?? '—'}</td>
                <td className="px-3 py-2">{s.contactPhone ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(s)} className="underline">
                    Éditer
                  </button>
                </td>
              </tr>
            ))}
            {!loading && pagedItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center opacity-60">
                  Aucun fournisseur
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="text-sm">
          Page {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Suivant
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">
                {editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <div>
                <label className="block text-sm mb-1">Nom</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border rounded px-2 py-1 w-full"
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="border rounded px-2 py-1 w-full"
                  />
                  {errors.contactEmail && (
                    <p className="text-xs text-red-600">{errors.contactEmail}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1">Téléphone</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="border rounded px-2 py-1 w-full"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  Actif
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="border rounded px-3 py-1"
                >
                  Annuler
                </button>
                <button type="submit" className="border rounded px-3 py-1">
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
