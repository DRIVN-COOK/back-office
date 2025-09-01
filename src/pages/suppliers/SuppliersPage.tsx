import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { supplierCreateSchema, supplierUpdateSchema } from '@drivn-cook/shared';

type Row = { id: string; name: string; contactEmail?: string|null; contactPhone?: string|null; active: boolean; createdAt: string; };
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function SuppliersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ name:'', contactEmail:'', contactPhone:'', address:'', active:true });
  const [errors, setErrors] = useState<Record<string,string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<Row>>('/suppliers', { params: { search: query, page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [query, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  function openCreate(){ setEditing(null); setForm({ name:'', contactEmail:'', contactPhone:'', address:'', active:true }); setErrors({}); setIsOpen(true); }
  function openEdit(s: Row){ setEditing(s); setForm({ name:s.name, contactEmail:s.contactEmail ?? '', contactPhone:s.contactPhone ?? '', address:'', active:s.active }); setErrors({}); setIsOpen(true); }

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

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Fournisseurs</h1>
        <div className="ml-auto flex items-center gap-2">
          <input value={query} onChange={(e)=>{ setPage(1); setQuery(e.target.value); }} placeholder="Rechercher" className="border rounded px-2 py-1 text-sm"/>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">Nouveau</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">Nom</th>
            <th className="text-left px-3 py-2">Email</th>
            <th className="text-left px-3 py-2">Téléphone</th>
            <th className="text-left px-3 py-2">Actif</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.contactEmail ?? '—'}</td>
                <td className="px-3 py-2">{s.contactPhone ?? '—'}</td>
                <td className="px-3 py-2">{s.active ? 'Actif' : 'Inactif'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={()=>openEdit(s)} className="underline">Éditer</button>
                </td>
              </tr>
            ))}
            {!loading && items.length===0 && <tr><td colSpan={5} className="px-3 py-6 text-center opacity-60">Aucun fournisseur</td></tr>}
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
              <h2 className="text-lg font-semibold">{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
              <div>
                <label className="block text-sm mb-1">Nom</label>
                <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input value={form.contactEmail} onChange={e=>setForm({...form, contactEmail:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                  {errors.contactEmail && <p className="text-xs text-red-600">{errors.contactEmail}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">Téléphone</label>
                  <input value={form.contactPhone} onChange={e=>setForm({...form, contactPhone:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Adresse (optionnel)</label>
                <input value={form.address} onChange={e=>setForm({...form, address:e.target.value})} className="border rounded px-2 py-1 w-full"/>
              </div>
              <div className="flex items-center gap-4">
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
