import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';

type Row = {
  id:string; franchiseeId:string; startDate:string; endDate?:string|null;
  entryFeeAmount:string; revenueSharePct:string; notes?:string|null; createdAt:string;
};
type Paged<T> = { items:T[]; total:number; page:number; pageSize:number };

export default function AgreementsPage(){
  const [franchiseeId,setFranchiseeId] = useState('');
  const [items,setItems] = useState<Row[]>([]);
  const [loading,setLoading] = useState(false);
  const [page,setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total,setTotal] = useState(0);

  const [isOpen,setIsOpen] = useState(false);
  const [form,setForm] = useState({ startDate:'', endDate:'', entryFeeAmount:'50000.00', revenueSharePct:'0.0400', notes:'' });

  async function load(){
    if (!franchiseeId){ setItems([]); setTotal(0); return; }
    setLoading(true);
    try{
      const res = await api.get<Paged<Row>>('/franchisees/agreements', { params:{ franchiseeId, page, pageSize }});
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [franchiseeId, page, pageSize]);

  const pages = useMemo(()=>Math.max(1, Math.ceil(total/pageSize)),[total,pageSize]);

  async function createAgreement(e:React.FormEvent){
    e.preventDefault();
    const payload = { ...form, franchiseeId, endDate: form.endDate || undefined };
    await api.post('/franchisees/agreements', payload);
    setIsOpen(false); await load();
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Accords (franchisé)</h1>
        <div className="ml-auto flex items-center gap-2">
          <input value={franchiseeId} onChange={e=>{ setPage(1); setFranchiseeId(e.target.value); }} placeholder="FranchiseeId" className="border rounded px-2 py-1 text-sm"/>
          <button disabled={!franchiseeId} onClick={()=>setIsOpen(true)} className="border rounded px-2 py-1 text-sm">Nouvel accord</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading?'Chargement…':`Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">Début</th>
            <th className="text-left px-3 py-2">Fin</th>
            <th className="text-left px-3 py-2">Droit d’entrée (€)</th>
            <th className="text-left px-3 py-2">Redevance (%)</th>
            <th className="text-left px-3 py-2">Notes</th>
            <th className="text-left px-3 py-2">Créé le</th>
          </tr></thead>
          <tbody>
            {items.map(a=>(
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2">{new Date(a.startDate).toLocaleDateString()}</td>
                <td className="px-3 py-2">{a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2">{a.entryFeeAmount}</td>
                <td className="px-3 py-2">{Number(a.revenueSharePct)*100}%</td>
                <td className="px-3 py-2">{a.notes || '—'}</td>
                <td className="px-3 py-2">{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && items.length===0 && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucun accord</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>

      {/* Modal create */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-xl">
            <form onSubmit={createAgreement} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Nouvel accord</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Début (ISO)</label><input value={form.startDate} onChange={e=>setForm({...form, startDate:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
                <div><label className="block text-sm mb-1">Fin (ISO, optionnel)</label><input value={form.endDate} onChange={e=>setForm({...form, endDate:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Droit d’entrée (€ HT)</label><input value={form.entryFeeAmount} onChange={e=>setForm({...form, entryFeeAmount:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
                <div><label className="block text-sm mb-1">Redevance (ex: 0.0400)</label><input value={form.revenueSharePct} onChange={e=>setForm({...form, revenueSharePct:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
              </div>
              <div><label className="block text-sm mb-1">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} className="border rounded px-2 py-1 w-full" rows={3}/></div>
              <div className="flex justify-end gap-2">
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
