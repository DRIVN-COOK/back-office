// back-office/src/pages/catalog/ProductsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  Modal,
  DataTable,
  productCreateSchema,
  productUpdateSchema,
  ProductType,
  Unit,
  type Column,
} from '@drivn-cook/shared';
import { listProducts, createProduct, updateProduct } from '../../services';

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

type FormShape = {
  sku: string;
  name: string;
  type: ProductType;
  unit: Unit;
  isCoreStock: boolean;
  active: boolean;
};

const EMPTY_FORM: FormShape = {
  sku: '',
  name: '',
  type: Object.values(ProductType)[0] as ProductType,
  unit: Object.values(Unit)[0] as Unit,
  isCoreStock: true,
  active: true,
};

function normalizeForm(f: FormShape) {
  return {
    ...f,
    sku: f.sku.trim(),
    name: f.name.trim(),
  };
}

export default function ProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Modal + form
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<FormShape>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // chargement liste
  async function load() {
    setLoading(true);
    try {
      const data = await listProducts({
        q: query || undefined,
        page,
        pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, pageSize]);

  // Fallback filtre client si l'API ne filtre pas (robustesse)
  const filteredItems = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) =>
      [p.sku, p.name, p.type, p.unit].some((v) => String(v ?? '').toLowerCase().includes(s)),
    );
  }, [items, query]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
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
    setErrors({});

    try {
      const normalized = normalizeForm(form);

      if (editing) {
        const payload = productUpdateSchema.parse(normalized);
        await updateProduct(editing.id, payload);
      } else {
        const payload = productCreateSchema.parse(normalized);
        await createProduct(payload);
        setPage(1);
      }
      setIsOpen(false);
      await load();
    } catch (err: unknown) {
      // Zod front
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
      // Erreur HTTP
      const anyErr = err as any;
      const msg =
        anyErr?.response?.data?.message ||
        anyErr?.response?.data?.error ||
        anyErr?.message ||
        'Erreur lors de la sauvegarde.';
      alert(msg);
      console.error(err);
    }
  }

  async function toggleActive(p: ProductRow) {
    const snapshot = [...items];
    setItems((list) => list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    try {
      await updateProduct(p.id, { active: !p.active });
    } catch (e) {
      console.error(e);
      setItems(snapshot);
      alert('Impossible de changer le statut.');
    }
  }

  const TYPE_OPTIONS = Object.values(ProductType) as ProductType[];
  const UNIT_OPTIONS = Object.values(Unit) as Unit[];

  // colonnes DataTable (shared)
  const columns: Column<ProductRow>[] = [
    { header: 'SKU', render: (p) => p.sku, getSortValue: (p) => p.sku, width: 'w-36' },
    { header: 'Nom', render: (p) => p.name, getSortValue: (p) => p.name, width: 'min-w-[200px]' },
    { header: 'Type', render: (p) => p.type, getSortValue: (p) => p.type, width: 'w-40' },
    { header: 'Unité', render: (p) => p.unit, getSortValue: (p) => p.unit, width: 'w-28' },
    {
      header: 'Core(80%)',
      render: (p) => (p.isCoreStock ? 'Oui' : 'Non'),
      getSortValue: (p) => (p.isCoreStock ? 1 : 0),
      width: 'w-28',
    },
    {
      header: 'Actif',
      render: (p) => (
        <button onClick={() => toggleActive(p)} className="underline">
          {p.active ? 'Actif' : 'Inactif'}
        </button>
      ),
      getSortValue: (p) => (p.active ? 1 : 0),
      width: 'w-24',
    },
    {
      header: 'Actions',
      render: (p) => (
        <div className="text-right space-x-3">
          <button onClick={() => openEdit(p)} className="underline">
            Éditer
          </button>
          <a href={`/prices?productId=${p.id}`} className="underline">
            Tarifs
          </a>
        </div>
      ),
      align: 'right',
      width: 'w-36',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Produits</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Rechercher (SKU, nom…)"
            className="border rounded px-2 py-1 text-sm"
          />
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">
            Nouveau
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <DataTable
        items={filteredItems}
        columns={columns}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        minTableWidth="min-w-[900px]"
      />

      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-lg">
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
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
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
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
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
      </Modal>
    </section>
  );
}
