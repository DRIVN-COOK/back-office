import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';
import { PO_STATUS, type POStatus } from '@drivn-cook/shared';
import { Link, useNavigate } from 'react-router-dom';

type Row = {
  id: string;
  franchiseeId: string;
  warehouseId: string;
  status: POStatus;
  corePct?: number | null;  // si ton API le calcule côté serveur
  totalHT?: string | null;
  createdAt: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function PurchaseOrdersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<POStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await api.get<Paged<Row>>('/purchase-orders', {
          params: { status: status === 'ALL' ? undefined : status, page, pageSize },
        });
        setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
      } catch (e) { console.error(e); setItems([]); setTotal(0); }
      finally { setLoading(false); }
    })();
  }, [status, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Commandes d’approvisionnement</h1>
        <div className="ml-auto flex items-center gap-2">
          <select value={status} onChange={(e)=>{ setPage(1); setStatus(e.target.value as any); }} className="border rounded px-2 py-1 text-sm">
            <option value="ALL">Tous statuts</option>
            {PO_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={()=>navigate('/purchase-orders/new')} className="border rounded px-2 py-1 text-sm">Nouvelle commande</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Franchisé</th>
              <th className="text-left px-3 py-2">Entrepôt</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Core %</th>
              <th className="text-left px-3 py-2">Total HT</th>
              <th className="text-left px-3 py-2">Créée le</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(po => (
              <tr key={po.id} className="border-t">
                <td className="px-3 py-2">{po.id.slice(0,8)}…</td>
                <td className="px-3 py-2">{po.franchiseeId.slice(0,8)}…</td>
                <td className="px-3 py-2">{po.warehouseId.slice(0,8)}…</td>
                <td className="px-3 py-2">{po.status}</td>
                <td className="px-3 py-2">{po.corePct != null ? `${po.corePct.toFixed(1)}%` : '—'}</td>
                <td className="px-3 py-2">{po.totalHT ?? '—'}</td>
                <td className="px-3 py-2">{new Date(po.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/purchase-orders/${po.id}`} className="underline">Ouvrir</Link>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center opacity-60">Aucune commande</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>
    </section>
  );
}
