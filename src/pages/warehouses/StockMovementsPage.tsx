import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';
import { STOCK_MOVE_TYPE, type StockMoveType } from '@drivn-cook/shared';

type Row = {
  id: string;
  warehouseId: string;
  productId: string;
  product?: { sku: string; name: string };
  qty: string; // ou number
  type: StockMoveType;
  refType?: string | null;
  refId?: string | null;
  createdAt: string;
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function StockMovementsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<StockMoveType | 'ALL'>('ALL');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<Row>>('/stock-movements', { params: { warehouseId, productId: productId || undefined, type: type==='ALL' ? undefined : type, page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { if (warehouseId) load(); }, [warehouseId, productId, type, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Mouvements de stock</h1>
        <input value={warehouseId} onChange={(e)=>{ setPage(1); setWarehouseId(e.target.value); }} placeholder="WarehouseId" className="border rounded px-2 py-1 text-sm"/>
        <input value={productId} onChange={(e)=>{ setPage(1); setProductId(e.target.value); }} placeholder="ProductId (optionnel)" className="border rounded px-2 py-1 text-sm"/>
        <select value={type} onChange={(e)=>{ setPage(1); setType(e.target.value as any); }} className="border rounded px-2 py-1 text-sm">
          <option value="ALL">Tous types</option>
          {STOCK_MOVE_TYPE.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </header>

      {warehouseId ? (
        <>
          <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-black/5"><tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Entrepôt</th>
                <th className="text-left px-3 py-2">Produit</th>
                <th className="text-left px-3 py-2">Qté</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Réf.</th>
              </tr></thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{m.warehouseId.slice(0,8)}…</td>
                    <td className="px-3 py-2">{m.product?.sku ?? m.productId} — {m.product?.name ?? ''}</td>
                    <td className="px-3 py-2">{m.qty}</td>
                    <td className="px-3 py-2">{m.type}</td>
                    <td className="px-3 py-2">{m.refType ? `${m.refType} #${m.refId?.slice(0,8)}…` : '—'}</td>
                  </tr>
                ))}
                {!loading && items.length===0 && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucun mouvement</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
            <span className="text-sm">Page {page} / {pages}</span>
            <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
          </div>
        </>
      ) : (
        <div className="opacity-60">Saisis un <code>WarehouseId</code> pour afficher les mouvements.</div>
      )}
    </section>
  );
}
