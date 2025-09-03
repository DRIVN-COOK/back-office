// back-office/src/pages/catalog/ProductsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
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
import { api } from '@drivn-cook/shared';

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  unit: Unit;             // gardé pour la persistance, non affiché
  isCoreStock: boolean;
  active: boolean;
  createdAt: string;
};

type FormShape = {
  sku: string;
  name: string;
  type: ProductType;
  isCoreStock: boolean;
};

// ── Libellés FR ────────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<ProductType, string> = {
  [ProductType.INGREDIENT]: 'Ingrédient',
  [ProductType.PREPARED_DISH]: 'Plat préparé',
  [ProductType.BEVERAGE]: 'Boisson',
  [ProductType.MISC]: 'Divers',
};

const TYPE_OPTIONS = Object.values(ProductType) as ProductType[];

function typeLabel(t: ProductType) {
  return TYPE_LABEL[t] ?? String(t);
}

const DEFAULT_UNIT: Unit = (Object.values(Unit).includes('UNIT' as Unit) ? 'UNIT' : Object.values(Unit)[0]) as Unit;

const EMPTY_FORM: FormShape = {
  sku: '',
  name: '',
  type: Object.values(ProductType)[0] as ProductType,
  isCoreStock: true,
};

function normalizeForm(f: FormShape) {
  return {
    ...f,
    sku: f.sku.trim(),
    name: f.name.trim(),
  };
}

// utils recherche
function norm(s: unknown) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
function matches(p: ProductRow, q: string) {
  const nq = norm(q);
  return (
    norm(p.sku).includes(nq) ||
    norm(p.name).includes(nq) ||
    norm(typeLabel(p.type)).includes(nq) // ← on cherche sur libellé FR
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Modal + form
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState<FormShape>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // debounce recherche
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // chargement liste
  async function load() {
    setLoading(true);
    try {
      const wantClientFilter = debouncedQuery.trim().length > 0;
      const effectivePage = wantClientFilter ? 1 : page;
      const effectivePageSize = wantClientFilter ? 100 : pageSize;

      const data = await listProducts({
        q: debouncedQuery || undefined,
        page: effectivePage,
        pageSize: effectivePageSize,
      });

      const list = data.items ?? [];
      const filtered = wantClientFilter ? list.filter(p => matches(p as ProductRow, debouncedQuery)) : list;

      setItems(filtered as ProductRow[]);
      setTotal(wantClientFilter ? filtered.length : (data.total ?? list.length));
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // reset page sur nouvelle recherche
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, page, pageSize]);

  // pagination client si filtre client actif
  const shownItems = useMemo(() => {
    if (!debouncedQuery) return items;
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, debouncedQuery]);

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
      isCoreStock: p.isCoreStock,
    });
    setErrors({});
    setIsOpen(true);
  }

  // suppression réelle (DELETE)
  async function deleteProduct(id: string) {
    if (!confirm('Supprimer définitivement ce produit ?')) return;
    const backup = [...items];
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await api.delete(`/products/${id}`);
      // re-sync (utile si l’API recalcule total)
      await load();
    } catch (e) {
      console.error(e);
      setItems(backup);
      alert('Suppression impossible.');
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    try {
      const normalized = normalizeForm(form);

      if (editing) {
        // on préserve l’unité existante (non affichée)
        const payload = productUpdateSchema.parse({
          ...normalized,
          unit: editing.unit,        // garder l’unité existante
          active: editing.active,    // on ne gère plus “actif” dans l’UI
        });
        await updateProduct(editing.id, payload);
      } else {
        // création : on injecte unit par défaut
        const payload = productCreateSchema.parse({
          ...normalized,
          unit: DEFAULT_UNIT,
          active: true,
        });
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

  // colonnes DataTable — “Type” en FR
  const columns: Column<ProductRow>[] = [
    { header: 'SKU', render: (p) => p.sku, getSortValue: (p) => p.sku, width: 'w-36' },
    { header: 'Nom', render: (p) => p.name, getSortValue: (p) => p.name, width: 'min-w-[220px]' },
    {
      header: 'Type',
      render: (p) => typeLabel(p.type),
      getSortValue: (p) => typeLabel(p.type).toLowerCase(),
      width: 'w-40',
    },
    {
      header: 'Actions',
      render: (p) => (
        <div className="text-right space-x-3">
          <button onClick={() => openEdit(p)} className="underline">Éditer</button>
          <button onClick={() => navigate(`/prices?productId=${p.id}`)} className="underline">
            Tarifs
          </button>
          <button onClick={() => deleteProduct(p.id)} className="text-red-600 underline">
            Supprimer
          </button>
        </div>
      ),
      align: 'right',
      width: 'w-48',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Produits</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (nom / type)"
              className="border rounded px-2 py-1 text-sm pr-6"
            />
            {query && (
              <button
                title="Effacer"
                onClick={() => setQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-1 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">
            Nouveau
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">
        {loading ? 'Chargement…' : `Total: ${total}${debouncedQuery ? ' (filtré)' : ''}`}
      </div>

      <DataTable
        items={shownItems}
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
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
              {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
            </div>
          </div>

          {/* NB: pas de champ Unité / Actif dans l’UI */}

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
