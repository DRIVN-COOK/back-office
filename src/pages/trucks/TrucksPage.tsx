import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { TRUCK_STATUS, type TruckStatus, truckCreateSchema, truckUpdateSchema } from '@drivn-cook/shared';

type TruckRow = {
  id: string;
  franchiseeId: string;
  vin: string;
  plateNumber: string;
  model?: string | null;
  purchaseDate?: string | null;
  active: boolean;
  currentStatus: TruckStatus;
  createdAt: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function TrucksPage() {
  const [items, setItems] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TruckStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<TruckRow | null>(null);
  const [form, setForm] = useState({
    franchiseeId: '',
    vin: '',
    plateNumber: '',
    model: '',
    purchaseDate: '',
    active: true,
    currentStatus: 'AVAILABLE' as TruckStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await api.get<Paged<TruckRow>>('/trucks', {
          params: { search: query, status: status === 'ALL' ? undefined : status, page, pageSize },
        });
        setItems(res.data.items ?? []);
        setTotal(res.data.total ?? res.data.items?.length ?? 0);
      } catch (e) {
        console.error(e);
        setItems([]); setTotal(0);
      } finally { setLoading(false); }
    })();
  }, [query, status, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  function openCreate() {
    setEditing(null);
    setForm({ franchiseeId: '', vin: '', plateNumber: '', model: '', purchaseDate: '', active: true, currentStatus: 'AVAILABLE' });
    setErrors({});
    setIsOpen(true);
  }
  function openEdit(t: TruckRow) {
    setEditing(t);
    setForm({
      franchiseeId: t.franchiseeId,
      vin: t.vin,
      plateNumber: t.plateNumber,
      model: t.model ?? '',
      purchaseDate: t.purchaseDate ?? '',
      active: t.active,
      currentStatus: t.currentStatus,
    });
    setErrors({});
    setIsOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const payload = truckUpdateSchema.parse(form);
        await api.put(`/trucks/${editing.id}`, payload);
      } else {
        const payload = truckCreateSchema.parse(form);
        await api.post(`/trucks`, payload);
        setPage(1);
      }
      setIsOpen(false);
      const res = await api.get<Paged<TruckRow>>('/trucks', { params: { search: query, status: status === 'ALL' ? undefined : status, page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        const map: Record<string, string> = {};
        (err as z.ZodError).errors.forEach(e => { if (e.path[0]) map[e.path[0] as string] = e.message; });
        setErrors(map);
      } else {
        alert('Erreur de sauvegarde'); console.error(err);
      }
    }
  }

  async function setStatusOf(t: TruckRow, next: TruckStatus) {
    const snapshot = [...items];
    setItems(list => list.map(x => x.id === t.id ? { ...x, currentStatus: next } : x));
    try { await api.put(`/trucks/${t.id}`, { currentStatus: next }); }
    catch (e) { console.error(e); setItems(snapshot); alert('Maj statut impossible'); }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Parc de camions</h1>
        <div className="ml-auto flex items-center gap-2">
          <input value={query} onChange={(e)=>{ setPage(1); setQuery(e.target.value); }} placeholder="VIN / plaque / modèle" className="border rounded px-2 py-1 text-sm"/>
          <select value={status} onChange={(e)=>{ setPage(1); setStatus(e.target.value as any); }} className="border rounded px-2 py-1 text-sm">
            <option value="ALL">Tous statuts</option>
            {TRUCK_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">Nouveau</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Plaque</th>
              <th className="text-left px-3 py-2">VIN</th>
              <th className="text-left px-3 py-2">Modèle</th>
              <th className="text-left px-3 py-2">Franchisé</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.plateNumber}</td>
                <td className="px-3 py-2">{t.vin}</td>
                <td className="px-3 py-2">{t.model ?? '—'}</td>
                <td className="px-3 py-2">{t.franchiseeId.slice(0,8)}…</td>
                <td className="px-3 py-2">
                  <select value={t.currentStatus} onChange={e => setStatusOf(t, e.target.value as TruckStatus)} className="border rounded px-2 py-1">
                    {TRUCK_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(t)} className="underline">Éditer</button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucun camion</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>

      {/* Modal create/edit */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">{editing ? 'Modifier camion' : 'Nouveau camion'}</h2>

              <div>
                <label className="block text-sm mb-1">FranchiseeId</label>
                <input value={form.franchiseeId} onChange={e=>setForm({...form, franchiseeId:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                {errors.franchiseeId && <p className="text-xs text-red-600">{errors.franchiseeId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">VIN</label>
                  <input value={form.vin} onChange={e=>setForm({...form, vin:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                  {errors.vin && <p className="text-xs text-red-600">{errors.vin}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">Plaque</label>
                  <input value={form.plateNumber} onChange={e=>setForm({...form, plateNumber:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                  {errors.plateNumber && <p className="text-xs text-red-600">{errors.plateNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Modèle</label>
                  <input value={form.model} onChange={e=>setForm({...form, model:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                </div>
                <div>
                  <label className="block text-sm mb-1">Achat (optionnel)</label>
                  <input type="datetime-local" value={form.purchaseDate ? new Date(form.purchaseDate).toISOString().slice(0,16) : ''} onChange={e=>setForm({...form, purchaseDate:e.target.value? new Date(e.target.value).toISOString(): ''})} className="border rounded px-2 py-1 w-full"/>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})}/> Actif
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  Statut
                  <select value={form.currentStatus} onChange={e=>setForm({...form, currentStatus: e.target.value as TruckStatus})} className="border rounded px-2 py-1">
                    {TRUCK_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsOpen(false)} className="border rounded px-3 py-1">Annuler</button>
                <button type="submit" className="border rounded px-3 py-1">{editing? 'Enregistrer':'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
