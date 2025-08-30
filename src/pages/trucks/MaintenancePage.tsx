import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { MAINTENANCE_TYPE, MAINTENANCE_STATUS, type MaintenanceStatus, maintenanceCreateSchema } from '@drivn-cook/shared';

type Row = {
  id: string;
  truckId: string;
  type: typeof MAINTENANCE_TYPE[number];
  status: MaintenanceStatus;
  scheduledAt?: string | null;
  completedAt?: string | null;
  cost?: string | null;
  notes?: string | null;
  truck?: { plateNumber: string };
  createdAt: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

function toLocal(iso?: string | null) { return iso ? new Date(iso).toLocaleString() : '—'; }

export default function MaintenancePage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MaintenanceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    truckId: '',
    type: MAINTENANCE_TYPE[0],
    status: 'PLANNED' as MaintenanceStatus,
    scheduledAt: '',
    completedAt: '',
    cost: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await api.get<Paged<Row>>('/maintenance', { params: { status: status==='ALL' ? undefined : status, page, pageSize } });
        setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
      } catch (e) { console.error(e); setItems([]); setTotal(0); }
      finally { setLoading(false); }
    })();
  }, [status, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : undefined,
        cost: form.cost || undefined,
      };
      maintenanceCreateSchema.parse(payload);
      await api.post('/maintenance', payload);
      setIsOpen(false);
      const res = await api.get<Paged<Row>>('/maintenance', { params: { status: status==='ALL' ? undefined : status, page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        const map: Record<string, string> = {};
        (err as z.ZodError).errors.forEach(e => { if (e.path[0]) map[e.path[0] as string] = e.message; });
        setErrors(map);
      } else { alert('Erreur création maintenance'); console.error(err); }
    }
  }

  async function advanceStatus(id: string, next: MaintenanceStatus) {
    const snapshot = [...items];
    setItems(list => list.map(x => x.id === id ? { ...x, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : x.completedAt } : x));
    try { await api.put(`/maintenance/${id}`, { status: next }); }
    catch (e) { console.error(e); setItems(snapshot); alert('Maj statut impossible'); }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Maintenance & Pannes</h1>
        <div className="ml-auto flex items-center gap-2">
          <select value={status} onChange={(e)=>{ setPage(1); setStatus(e.target.value as any); }} className="border rounded px-2 py-1 text-sm">
            <option value="ALL">Tous statuts</option>
            {MAINTENANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={()=>{ setErrors({}); setIsOpen(true); }} className="border rounded px-2 py-1 text-sm">Nouvelle fiche</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Camion</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Planifié</th>
              <th className="text-left px-3 py-2">Terminé</th>
              <th className="text-left px-3 py-2">Coût</th>
              <th className="text-left px-3 py-2">Notes</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id} className="border-t">
                <td className="px-3 py-2">{m.truck?.plateNumber ?? m.truckId}</td>
                <td className="px-3 py-2">{m.type}</td>
                <td className="px-3 py-2">{m.status}</td>
                <td className="px-3 py-2">{toLocal(m.scheduledAt)}</td>
                <td className="px-3 py-2">{toLocal(m.completedAt)}</td>
                <td className="px-3 py-2">{m.cost ?? '—'}</td>
                <td className="px-3 py-2 max-w-[280px] truncate" title={m.notes ?? ''}>{m.notes ?? '—'}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  {m.status === 'PLANNED' && <button onClick={()=>advanceStatus(m.id,'IN_PROGRESS')} className="underline">Démarrer</button>}
                  {m.status === 'IN_PROGRESS' && <button onClick={()=>advanceStatus(m.id,'DONE')} className="underline">Terminer</button>}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center opacity-60">Aucune maintenance</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>

      {/* Modal nouvelle maintenance */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Nouvelle maintenance / panne</h2>

              <div>
                <label className="block text-sm mb-1">TruckId</label>
                <input value={form.truckId} onChange={e=>setForm({...form, truckId:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                {errors.truckId && <p className="text-xs text-red-600">{errors.truckId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Type</label>
                  <select value={form.type} onChange={(e)=>setForm({...form, type:e.target.value as any})} className="border rounded px-2 py-1 w-full">
                    {MAINTENANCE_TYPE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Statut</label>
                  <select value={form.status} onChange={(e)=>setForm({...form, status:e.target.value as MaintenanceStatus})} className="border rounded px-2 py-1 w-full">
                    {MAINTENANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Planifié</label>
                  <input type="datetime-local" value={form.scheduledAt ? new Date(form.scheduledAt).toISOString().slice(0,16):''} onChange={(e)=>setForm({...form, scheduledAt: e.target.value? new Date(e.target.value).toISOString(): ''})} className="border rounded px-2 py-1 w-full"/>
                </div>
                <div>
                  <label className="block text-sm mb-1">Terminé (optionnel)</label>
                  <input type="datetime-local" value={form.completedAt ? new Date(form.completedAt).toISOString().slice(0,16):''} onChange={(e)=>setForm({...form, completedAt: e.target.value? new Date(e.target.value).toISOString(): ''})} className="border rounded px-2 py-1 w-full"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Coût (HT)</label>
                <input value={form.cost} onChange={(e)=>setForm({...form, cost:e.target.value})} className="border rounded px-2 py-1 w-full" placeholder="125.00"/>
                {errors.cost && <p className="text-xs text-red-600">{errors.cost}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">Notes</label>
                  <input value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsOpen(false)} className="border rounded px-3 py-1">Annuler</button>
                <button type="submit" className="border rounded px-3 py-1">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
