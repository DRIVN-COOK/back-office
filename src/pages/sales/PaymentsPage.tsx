import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';
import { PAYMENT_PROVIDER, PAYMENT_STATUS } from '@drivn-cook/shared';

type Row = { id:string; customerOrderId:string; provider:string; amount:string; status:string; paidAt?:string|null; createdAt:string; };

type Paged<T> = { items:T[]; total:number; page:number; pageSize:number };

export default function PaymentsPage(){
  const [q,setQ] = useState({ provider:'', status:'', page:1, pageSize:50 });
  const [items,setItems] = useState<Row[]>([]);
  const [total,setTotal] = useState(0);
  const [loading,setLoading] = useState(false);

  async function load(){
    setLoading(true);
    try{
      const params = { ...q, provider: q.provider || undefined, status: q.status || undefined };
      const res = await api.get<Paged<Row>>('/payments', { params });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [q.page,q.pageSize]);

  const pages = useMemo(()=>Math.max(1, Math.ceil(total/q.pageSize)),[total,q.pageSize]);

  async function markPaid(id:string){
    await api.put(`/payments/${id}`, { status:'PAID', paidAt: new Date().toISOString() });
    await load();
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Paiements</h1>
        <div className="ml-auto flex items-center gap-2">
          <select value={q.provider} onChange={e=>setQ(p=>({ ...p, provider:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm">
            <option value="">Tous</option>{PAYMENT_PROVIDER.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={q.status} onChange={e=>setQ(p=>({ ...p, status:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm">
            <option value="">Tous statuts</option>{PAYMENT_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={()=>setQ(p=>({ ...p }))} className="border rounded px-2 py-1 text-sm">Filtrer</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading?'Chargement…':`Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">Order</th>
            <th className="text-left px-3 py-2">Provider</th>
            <th className="text-left px-3 py-2">Montant</th>
            <th className="text-left px-3 py-2">Statut</th>
            <th className="text-left px-3 py-2">Payé le</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
            {items.map(p=>(
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.customerOrderId.slice(0,8)}…</td>
                <td className="px-3 py-2">{p.provider}</td>
                <td className="px-3 py-2">{p.amount}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</td>
                <td className="px-3 py-2 text-right">
                  {p.status!=='PAID' && <button onClick={()=>markPaid(p.id)} className="underline">Marquer payé</button>}
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucun paiement</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={q.page<=1} onClick={()=>setQ(p=>({ ...p, page: Math.max(1,p.page-1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {q.page} / {pages}</span>
        <button disabled={q.page>=pages} onClick={()=>setQ(p=>({ ...p, page: Math.min(pages,p.page+1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>
    </section>
  );
}
