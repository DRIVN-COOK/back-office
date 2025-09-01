import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { warehouseCreateSchema, warehouseUpdateSchema } from '@drivn-cook/shared';

type Row = {
  id: string; name: string; city?: string | null; postalCode?: string | null;
  hasKitchen: boolean; active: boolean; createdAt: string;
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function WarehousesPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', postalCode: '', hasKitchen: true, active: true });
  const [errors, setErrors] = useState<Record<string,string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<Row>>('/warehouses', { params: { search: query, page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [query, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  function openCreate() { setEditing(null); setForm({ name:'', address:'', city:'', postalCode:'', hasKitchen:true, active:true }); setErrors({}); setIsOpen(true); }
  function openEdit(w: Row) { setEditing(w); setForm({ name:w.name, address:'', city:w.city ?? '', postalCode:w.postalCode ?? '', hasKitchen:w.hasKitchen, active:w.active }); setErrors({}); setIsOpen(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const payload = warehouseUpdateSchema.parse(form);
        await api.put(`/warehouses/${editing.id}`, payload);
      } else {
        const payload = warehouseCreateSchema.parse(form);
        await api.post('/warehouses', payload);
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

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Entrepôts</h1>
        <div className="ml-auto flex items-center gap-2">
          <input value={query} onChange={(e)=>{ setPage(1); setQuery(e.target.value); }} placeholder="Rechercher (nom, ville…)" className="border rounded px-2 py-1 text-sm"/>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">Nouvel entrepôt</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">Nom</th>
            <th className="text-left px-3 py-2">Ville</th>
            <th className="text-left px-3 py-2">Code postal</th>
            <th className="text-left px-3 py-2">Cuisine</th>
            <th className="text-left px-3 py-2">Actif</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
          {items.map(w => (
            <tr key={w.id} className="border-t">
              <td className="px-3 py-2">{w.name}</td>
              <td className="px-3 py-2">{w.city ?? '—'}</td>
              <td className="px-3 py-2">{w.postalCode ?? '—'}</td>
              <td className="px-3 py-2">{w.hasKitchen ? 'Oui' : 'Non'}</td>
              <td className="px-3 py-2">{w.active ? 'Actif' : 'Inactif'}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={()=>openEdit(w)} className="underline">Éditer</button>
              </td>
            </tr>
          ))}
          {!loading && items.length===0 && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucun entrepôt</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">{editing ? 'Modifier l’entrepôt' : 'Nouvel entrepôt'}</h2>

              <div>
                <label className="block text-sm mb-1">Nom</label>
                <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Ville</label>
                  <input value={form.city} onChange={e=>setForm({...form, city:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                </div>
                <div>
                  <label className="block text-sm mb-1">Code postal</label>
                  <input value={form.postalCode} onChange={e=>setForm({...form, postalCode:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.hasKitchen} onChange={e=>setForm({...form, hasKitchen:e.target.checked})}/> Cuisine
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})}/> Actif
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsOpen(false)} className="border rounded px-3 py-1">Annuler</button>
                <button type="submit" className="border rounded px-3 py-1">{editing ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
