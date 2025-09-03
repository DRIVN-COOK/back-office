import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';

type Row = {
  id: string;
  warehouseId: string;
  productId: string;
  product?: { sku: string; name: string; unit: 'KG' | 'L' | 'UNIT' };
  onHand: string;    // string côté API
  reserved: string;  // on ne l’affiche plus
  updatedAt: string;
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

type Warehouse = {
  id: string;
  name?: string | null;
  code?: string | null;
  city?: string | null;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  unit: 'KG' | 'L' | 'UNIT';
  active?: boolean;
};

type EditForm = {
  id: string;          // id de la ligne d’inventaire
  productId: string;   // peut être changé
  onHand: string;      // modifie directement la quantité affichée
};

export default function InventoryPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [query] = useState('');
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Entrepôts
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [whLoading, setWhLoading] = useState(false);

  // Produits (pour l’édition)
  const [products, setProducts] = useState<Product[]>([]);
  const [prodLoading, setProdLoading] = useState(false);

  // Modale d’édition
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<EditForm>({ id: '', productId: '', onHand: '0' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charge les entrepôts
  useEffect(() => {
    (async () => {
      setWhLoading(true);
      try {
        const res = await api.get<Paged<Warehouse>>('/warehouses', { params: { page: 1, pageSize: 100 } });
        setWarehouses(res.data.items ?? []);
      } catch (e) {
        console.error('Impossible de charger les entrepôts', e);
      } finally {
        setWhLoading(false);
      }
    })();
  }, []);

  // Charge la liste des produits (pour le select de la modale)
  useEffect(() => {
    (async () => {
      setProdLoading(true);
      try {
        const res = await api.get<Paged<Product>>('/products', { params: { page: 1, pageSize: 100 } });
        setProducts(res.data.items ?? []);
      } catch (e) {
        console.error('Impossible de charger les produits', e);
      } finally {
        setProdLoading(false);
      }
    })();
  }, []);

  // Options d’entrepôts
  const warehouseOptions = useMemo(() => {
    const opts = warehouses.map((w): { id: string; label: string } => {
      const labelParts = [w.name ?? w.code, w.city].filter(Boolean) as string[];
      return { id: w.id, label: labelParts.length ? labelParts.join(' — ') : w.id };
    });
    return opts.sort(
      (a: { label: string }, b: { label: string }) =>
        a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
    );
  }, [warehouses]);

  // Options de produits
  const productOptions = useMemo(() => {
    const opts = products.map(p => ({
      id: p.id,
      unit: p.unit,
      label: `${p.name} (${p.sku})`,
    }));
    return opts.sort(
      (a: { label: string }, b: { label: string }) =>
        a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
    );
  }, [products]);

  // Charger l’inventaire
  async function load() {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const res = await api.get<Paged<Row>>('/warehouse-inventories', {
        params: { warehouseId, search: query || undefined, page, pageSize },
      });
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (warehouseId) load();
  }, [warehouseId, query, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Ouvrir la modale d’édition sur la ligne choisie
  function openEditModal(row: Row) {
    setErrors({});
    setForm({
      id: row.id,
      productId: row.productId,
      onHand: row.onHand ?? '0',
    });
    setIsOpen(true);
  }

  const currentUnit = useMemo(() => {
    if (!form.productId) return undefined as Product['unit'] | undefined;
    return products.find(p => p.id === form.productId)?.unit;
  }, [form.productId, products]);
  const qtyStep = currentUnit === 'UNIT' ? 1 : 0.001;

  // Soumission = mise à jour directe de la ligne d’inventaire
  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: Partial<Row> = {
        productId: form.productId || undefined,
        onHand: form.onHand,
      };
      await api.put(`/warehouse-inventories/${form.id}`, payload);
      setIsOpen(false);
      await load();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Mise à jour impossible';
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

      </header>

      {warehouseId ? (
        <>
          <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-3 py-2">Produit</th>
                  <th className="text-left px-3 py-2">Quantité</th>
                  <th className="text-left px-3 py-2">Dernière mise à jour</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-3 py-2">
                      {inv.product?.name ?? inv.productId} {inv.product?.sku ? `(${inv.product.sku})` : ''}
                    </td>
                    <td className="px-3 py-2">{inv.onHand}</td>
                    <td className="px-3 py-2">{new Date(inv.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => openEditModal(inv)}
                        className="underline"
                      >
                        Éditer
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center opacity-60">
                      Aucun stock
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border rounded px-2 py-1 disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="text-sm">Page {page} / {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="border rounded px-2 py-1 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </>
      ) : (
        <div className="opacity-60">Choisis un entrepôt pour afficher l’inventaire.</div>
      )}

      {/* Modale édition directe de l’inventaire */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submitEdit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Éditer l’inventaire</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Produit</label>
                  <select
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className="border rounded px-2 py-1 w-full"
                    disabled={prodLoading || productOptions.length === 0}
                  >
                    <option value="">
                      {prodLoading ? 'Chargement des produits…' : '— Choisir un produit —'}
                    </option>
                    {productOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.productId && <p className="text-xs text-red-600">{errors.productId}</p>}
                </div>

                <div>
                  <label className="block text-sm mb-1">Quantité</label>
                  <input
                    type="number"
                    step={qtyStep}
                    value={form.onHand}
                    onChange={(e) => setForm({ ...form, onHand: e.target.value })}
                    className="border rounded px-2 py-1 w-full"
                    placeholder={currentUnit === 'UNIT' ? 'ex: 2' : 'ex: 0.500'}
                  />
                  {currentUnit && (
                    <p className="text-xs opacity-60 mt-1">Unité : {currentUnit}</p>
                  )}
                  {errors.onHand && <p className="text-xs text-red-600">{errors.onHand}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="border rounded px-3 py-1">
                  Annuler
                </button>
                <button type="submit" className="border rounded px-3 py-1">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
