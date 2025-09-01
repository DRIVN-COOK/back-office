import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { deploymentCreateSchema } from '@drivn-cook/shared';

type DeploymentRow = {
  id: string;
  truckId: string;
  franchiseeId: string;
  locationId?: string | null;
  plannedStart: string;
  plannedEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  notes?: string | null;
  truck?: { plateNumber: string; vin: string };
  location?: { name: string };
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

function toLocal(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export default function DeploymentsPage() {
  const [items, setItems] = useState<DeploymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    truckId: '',
    franchiseeId: '',
    locationId: '',
    plannedStart: new Date().toISOString(),
    plannedEnd: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await api.get<Paged<DeploymentRow>>('/truck-deployments', { params: { page, pageSize } });
        setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
      } catch (e) { console.error(e); setItems([]); setTotal(0); }
      finally { setLoading(false); }
    })();
  }, [page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        plannedEnd: form.plannedEnd ? new Date(form.plannedEnd).toISOString() : undefined,
      };
      deploymentCreateSchema.parse(payload);
      await api.post('/truck-deployments', payload);
      setIsOpen(false);
      const res = await api.get<Paged<DeploymentRow>>('/truck-deployments', { params: { page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
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
        'Erreur de création';
      alert(msg);
      console.error(err);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Déploiements</h1>
        <div className="ml-auto"><button onClick={()=>{ setErrors({}); setIsOpen(true); }} className="border rounded px-2 py-1 text-sm">Nouveau</button></div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Camion</th>
              <th className="text-left px-3 py-2">Lieu</th>
              <th className="text-left px-3 py-2">Prévu (début → fin)</th>
              <th className="text-left px-3 py-2">Réel (début → fin)</th>
              <th className="text-left px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2">{d.truck?.plateNumber ?? d.truckId} — {d.truck?.vin ?? ''}</td>
                <td className="px-3 py-2">{d.location?.name ?? d.locationId ?? '—'}</td>
                <td className="px-3 py-2">{toLocal(d.plannedStart)} → {toLocal(d.plannedEnd)}</td>
                <td className="px-3 py-2">{toLocal(d.actualStart)} → {toLocal(d.actualEnd)}</td>
                <td className="px-3 py-2">{d.notes ?? '—'}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center opacity-60">Aucun déploiement</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>

      {/* Modal nouveau */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Planifier un déploiement</h2>

              <div>
                <label className="block text-sm mb-1">TruckId</label>
                <input value={form.truckId} onChange={e=>setForm({...form, truckId:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                {errors.truckId && <p className="text-xs text-red-600">{errors.truckId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">FranchiseeId</label>
                  <input value={form.franchiseeId} onChange={e=>setForm({...form, franchiseeId:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                  {errors.franchiseeId && <p className="text-xs text-red-600">{errors.franchiseeId}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">LocationId (optionnel)</label>
                  <input value={form.locationId} onChange={e=>setForm({...form, locationId:e.target.value})} className="border rounded px-2 py-1 w-full"/>
                  {errors.locationId && <p className="text-xs text-red-600">{errors.locationId}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Début (prévu)</label>
                  <input type="datetime-local" value={new Date(form.plannedStart).toISOString().slice(0,16)} onChange={e=>setForm({...form, plannedStart:new Date(e.target.value).toISOString()})} className="border rounded px-2 py-1 w-full"/>
                  {errors.plannedStart && <p className="text-xs text-red-600">{errors.plannedStart}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">Fin (prévu)</label>
                  <input type="datetime-local" value={form.plannedEnd ? new Date(form.plannedEnd).toISOString().slice(0,16):''} onChange={e=>setForm({...form, plannedEnd: e.target.value? new Date(e.target.value).toISOString(): ''})} className="border rounded px-2 py-1 w-full"/>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} className="border rounded px-2 py-1 w-full" rows={3}/>
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
