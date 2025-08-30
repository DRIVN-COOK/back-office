import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';
import { ORDER_STATUS, ORDER_CHANNEL, orderQuerySchema } from '@drivn-cook/shared';
import { Link } from 'react-router-dom';

type Row = {
  id: string;
  customerId: string;
  franchiseeId: string;
  truckId?: string | null;
  channel: typeof ORDER_CHANNEL[number];
  status: typeof ORDER_STATUS[number];
  placedAt: string;
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function CustomerOrdersPage() {
  const [q, setQ] = useState({ search:'', status:'', channel:'', from:'', to:'', truckId:'', franchiseeId:'', page:1, pageSize:20 });
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { ...q, status: q.status || undefined, channel: q.channel || undefined, truckId: q.truckId || undefined, franchiseeId: q.franchiseeId || undefined, search: q.search || undefined };
      orderQuerySchema.parse(params);
      const res = await api.get<Paged<Row>>('/orders', { params });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q.page, q.pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / q.pageSize)), [total, q.pageSize]);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Commandes clients</h1>
        <div className="ml-auto grid grid-cols-2 md:grid-cols-7 gap-2">
          <input placeholder="Recherche" value={q.search} onChange={e=>setQ(p=>({ ...p, search:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm"/>
          <select value={q.status} onChange={e=>setQ(p=>({ ...p, status:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm">
            <option value="">Tous statuts</option>
            {ORDER_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select value={q.channel} onChange={e=>setQ(p=>({ ...p, channel:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm">
            <option value="">Tous canaux</option>
            {ORDER_CHANNEL.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="FranchiseeId" value={q.franchiseeId} onChange={e=>setQ(p=>({ ...p, franchiseeId:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm"/>
          <input placeholder="TruckId" value={q.truckId} onChange={e=>setQ(p=>({ ...p, truckId:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm"/>
          <input placeholder="From (ISO)" value={q.from} onChange={e=>setQ(p=>({ ...p, from:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm"/>
          <input placeholder="To (ISO)" value={q.to} onChange={e=>setQ(p=>({ ...p, to:e.target.value, page:1 }))} className="border rounded px-2 py-1 text-sm"/>
        </div>
        <button onClick={()=>setQ(p=>({ ...p }))} className="border rounded px-2 py-1 text-sm">Filtrer</button>
      </header>

      <div className="text-sm opacity-70">{loading?'Chargement…':`Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">#</th>
            <th className="text-left px-3 py-2">Canal</th>
            <th className="text-left px-3 py-2">Statut</th>
            <th className="text-left px-3 py-2">Franchisé</th>
            <th className="text-left px-3 py-2">Camion</th>
            <th className="text-left px-3 py-2">Placé le</th>
            <th className="text-left px-3 py-2">Total TTC</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
            {items.map(o=>(
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">{o.id.slice(0,8)}…</td>
                <td className="px-3 py-2">{o.channel}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2">{o.franchiseeId.slice(0,8)}…</td>
                <td className="px-3 py-2">{o.truckId ? o.truckId.slice(0,8)+'…' : '—'}</td>
                <td className="px-3 py-2">{new Date(o.placedAt).toLocaleString()}</td>
                <td className="px-3 py-2">{o.totalTTC}</td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/orders/${o.id}`} className="underline">Ouvrir</Link>
                </td>
              </tr>
            ))}
            {!loading && items.length===0 && <tr><td colSpan={8} className="px-3 py-6 text-center opacity-60">Aucune commande</td></tr>}
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
