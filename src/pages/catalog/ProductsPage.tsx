// back-office/src/pages/catalog/ProductsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import {
  productCreateSchema,
  productUpdateSchema,
  PRODUCT_TYPE, type ProductType,
  UNIT, type Unit,
} from '@drivn-cook/shared'; // adapte l'import si besoin

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  unit: Unit;
  isCoreStock: boolean;
  active: boolean;
  createdAt: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function ProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState({
    sku: '', name: '',
    type: PRODUCT_TYPE[0] as ProductType,
    unit: UNIT[2] as Unit, // UNIT
    isCoreStock: true,
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await api.get<Paged<ProductRow>>('/products', { params: { search: query, page, pageSize } });
        setItems(res.data.items ?? []);
        setTotal(res.data.total ?? res.data.items?.length ?? 0);
      } catch (e) {
        console.error(e);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [query, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  function openCreate() {
    setEditing(null);
    setForm({ sku: '', name: '', type: PRODUCT_TYPE[0], unit: UNIT[2], isCoreStock: true, active: true });
    setErrors({});
    setIsOpen(true);
  }

  function openEdit(p: ProductRow) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      type: p.type,
      unit: p.unit,
      isCoreStock: p.isCoreStock,
      active: p.active,
    });
    setErrors({});
    setIsOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const parsed = productUpdateSchema.parse(form);
        await api.put(`/products/${editing.id}`, parsed);
      } else {
        const parsed = productCreateSchema.parse(form);
        await api.post('/products', parsed);
        setPage(1);
      }
      setIsOpen(false);
      // reload
      const res = await api.get<Paged<ProductRow>>('/products', { params: { search: query, page, pageSize } });
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } catch (err: any) {
      console.error(err);
      if (err?.name === 'ZodError') {
        const zerr = err as z.ZodError;
        const map: Record<string, string> = {};
        zerr.errors.forEach((e: { path: string[]; message: string; }) => { if (e.path[0]) map[e.path[0] as string] = e.message; });
        setErrors(map);
      } else {
        alert('Erreur lors de la sauvegarde.');
      }
    }
  }

  async function toggleActive(p: ProductRow) {
    const snapshot = [...items];
    setItems(list => list.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
    try {
      await api.put(`/products/${p.id}`, { active: !p.active });
    } catch (e) {
      console.error(e);
      setItems(snapshot);
      alert('Impossible de changer le statut.');
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Produits</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
            placeholder="Rechercher (SKU, nom…)"
            className="border rounded px-2 py-1 text-sm"
          />
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">
            Nouveau
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">SKU</th>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Unité</th>
              <th className="text-left px-3 py-2">Core(80%)</th>
              <th className="text-left px-3 py-2">Actif</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.sku}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.type}</td>
                <td className="px-3 py-2">{p.unit}</td>
                <td className="px-3 py-2">{p.isCoreStock ? 'Oui' : 'Non'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleActive(p)} className="underline">
                    {p.active ? 'Actif' : 'Inactif'}
                  </button>
                </td>
                <td className="px-3 py-2 text-right space-x-3">
                  <button onClick={() => openEdit(p)} className="underline">Éditer</button>
                  <a href={`/prices?productId=${p.id}`} className="underline">Tarifs</a>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center opacity-60">Aucun produit</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination simple */}
      <div className="flex items-center gap-2 justify-end">
        <button
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button
          disabled={page >= pages}
          onClick={() => setPage(p => Math.min(pages, p + 1))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Suivant
        </button>
      </div>

      {/* Modal create/edit */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submitForm} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">{editing ? 'Modifier le produit' : 'Nouveau produit'}</h2>

              <div>
                <label className="block text-sm mb-1">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="border rounded px-2 py-1 w-full"
                />
                {errors.sku && <p className="text-xs text-red-600">{errors.sku}</p>}
              </div>

              <div>
                <label className="block text-sm mb-1">Nom</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border rounded px-2 py-1 w-full"
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ProductType })}
                    className="border rounded px-2 py-1 w-full"
                  >
                    {PRODUCT_TYPE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
                </div>

                <div>
                  <label className="block text-sm mb-1">Unité</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}
                    className="border rounded px-2 py-1 w-full"
                  >
                    {UNIT.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {errors.unit && <p className="text-xs text-red-600">{errors.unit}</p>}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isCoreStock}
                    onChange={(e) => setForm({ ...form, isCoreStock: e.target.checked })}
                  />
                  Core (80%)
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  Actif
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="border rounded px-3 py-1">
                  Annuler
                </button>
                <button type="submit" className="border rounded px-3 py-1">
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
