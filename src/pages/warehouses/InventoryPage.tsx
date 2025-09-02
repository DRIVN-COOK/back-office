import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { movementCreateSchema } from '@drivn-cook/shared';

type Row = {
  id: string;
  warehouseId: string;
  productId: string;
  product?: { sku: string; name: string; unit: 'KG'|'L'|'UNIT' };
  onHand: string;    // ou number côté API
  reserved: string;  // idem
  updatedAt: string;
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

// Modèle minimal d'entrepôt (adapte les champs si besoin)
type Warehouse = {
  id: string;
  name?: string | null;
  code?: string | null;
  city?: string | null;
};

export default function InventoryPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Options d'entrepôts
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [whLoading, setWhLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', qty: '0.000', notes: '' });
  const [errors, setErrors] = useState<Record<string,string>>({});

  // Charge les entrepôts une fois au montage
  useEffect(() => {
    (async () => {
      setWhLoading(true);
      try {
        // On récupère “beaucoup” d’entrpôts d’un coup; ajuste pageSize si tu en as vraiment beaucoup
        const res = await api.get<Paged<Warehouse>>('/warehouses', { params: { page: 1, pageSize: 100 } });
        setWarehouses(res.data.items ?? []);
      } catch (e) {
        console.error('Impossible de charger les entrepôts', e);
      } finally {
        setWhLoading(false);
      }
    })();
  }, []);

  // Options prêtes pour le <select>
  const warehouseOptions = useMemo(() => {
    const opts = warehouses.map((w): { id: string; label: string } => {
      const labelParts = [w.name ?? w.code, w.city].filter(Boolean) as string[];
      return { id: w.id, label: labelParts.length ? labelParts.join(' — ') : w.id };
    });
    // Tri alphabétique fr
    return opts.sort((a: {label: string}, b: {label: string}) =>
      a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
    );
  }, [warehouses]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<Row>>('/warehouse-inventories', { params: { warehouseId, search: query, page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { if (warehouseId) load(); }, [warehouseId, query, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function adjust(productId: string) {
    setErrors({});
    setForm({ productId, qty: '0.000', notes: '' });
    setIsOpen(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = movementCreateSchema.parse({ warehouseId, productId: form.productId, qty: form.qty, type: 'ADJUSTMENT', notes: form.notes });
      await api.post('/stock-movements', payload);
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
        'Ajustement impossible';
      alert(msg);
      console.error(err);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Inventaires</h1>

        {/* Sélecteur d’entrepôt */}
        <select
          value={warehouseId}
          onChange={(e) => { setPage(1); setWarehouseId(e.target.value); }}
          className="border rounded px-2 py-1 text-sm"
          disabled={whLoading || warehouseOptions.length === 0}
          aria-label="Choisir un entrepôt"
        >
          <option value="">{whLoading ? 'Chargement des entrepôts…' : '— Choisir un entrepôt —'}</option>
          {warehouseOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={(e)=>{ setPage(1); setQuery(e.target.value); }}
            placeholder="Rechercher (SKU, nom…)"
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </header>

      {warehouseId ? (
        <>
          <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-black/5"><tr>
                <th className="text-left px-3 py-2">Produit</th>
                <th className="text-left px-3 py-2">On hand</th>
                <th className="text-left px-3 py-2">Réservé</th>
                <th className="text-left px-3 py-2">Maj</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr></thead>
              <tbody>
                {items.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-3 py-2">{inv.product?.sku ?? inv.productId} — {inv.product?.name ?? ''}</td>
                    <td className="px-3 py-2">{inv.onHand}</td>
                    <td className="px-3 py-2">{inv.reserved}</td>
                    <td className="px-3 py-2">{new Date(inv.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={()=>adjust(inv.productId)} className="underline">Ajuster</button>
                    </td>
                  </tr>
                ))}
                {!loading && items.length===0 && <tr><td colSpan={5} className="px-3 py-6 text-center opacity-60">Aucun stock</td></tr>}
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
        <div className="opacity-60">Choisis un entrepôt pour afficher l’inventaire.</div>
      )}

      {/* Modal ajustement */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Ajustement de stock</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Produit</label>
                  <input value={form.productId} onChange={(e)=>setForm({...form, productId:e.target.value})} className="border rounded px-2 py-1 w-full" />
                  {errors.productId && <p className="text-xs text-red-600">{errors.productId}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">Quantité (+/-)</label>
                  <input value={form.qty} onChange={(e)=>setForm({...form, qty:e.target.value})} className="border rounded px-2 py-1 w-full" placeholder="ex: -2.000" />
                  {errors.qty && <p className="text-xs text-red-600">{errors.qty}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Notes (optionnel)</label>
                <input value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} className="border rounded px-2 py-1 w-full" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setIsOpen(false)} className="border rounded px-3 py-1">Annuler</button>
                <button type="submit" className="border rounded px-3 py-1">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
