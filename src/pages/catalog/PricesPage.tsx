// back-office/src/pages/catalog/PricesPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { api } from '@drivn-cook/shared';
import { productPriceCreateSchema } from '@drivn-cook/shared';

type PriceRow = {
  id: string;
  productId: string;
  validFrom: string; // ISO
  validTo?: string | null;
  priceHT: string;
  tvaPct: string;
  product?: { id: string; name: string; sku: string };
};
type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

type Product = { id: string; name: string; sku: string };

function toLocalDateTimeInputValue(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PricesPage() {
  const [params] = useSearchParams();
  const [productId, setProductId] = useState<string | undefined>(params.get('productId') ?? undefined);

  const [items, setItems] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    productId: productId ?? '',
    validFrom: new Date().toISOString(),
    validTo: '',
    priceHT: '',
    tvaPct: '5.50',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // cache local des produits (id -> product)
  const [productMap, setProductMap] = useState<Record<string, Product>>({});

  // charge tarifs
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await api.get<Paged<PriceRow>>('/product-prices', {
          params: { productId, page, pageSize },
        });
        const rows = res.data.items ?? [];
        setItems(rows);
        setTotal(res.data.total ?? rows.length);
      } catch (e) {
        console.error(e);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, page, pageSize]);

  // hydrate produits manquants si l’API n’a pas fait le include
  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        items
          .filter(r => !r.product && r.productId && !productMap[r.productId])
          .map(r => r.productId)
      )
    );
    if (missingIds.length === 0) return;

    (async () => {
      try {
        // stratégie simple & robuste : charger un gros lot et mapper
        // (adapte si ton API supporte GET /products?ids=... pour optimiser)
        const res = await api.get<Paged<Product>>('/products', { params: { page: 1, pageSize: 100 } });
        const all = res.data.items ?? [];
        const picked: Record<string, Product> = {};
        for (const p of all) {
          if (missingIds.includes(p.id)) picked[p.id] = { id: p.id, name: p.name, sku: p.sku };
        }
        if (Object.keys(picked).length) {
          setProductMap(prev => ({ ...prev, ...picked }));
        }
      } catch (e) {
        console.warn('Hydratation produits impossible, fallback sur productId/sku.', e);
      }
    })();
  }, [items, productMap]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  function displayProduct(row: PriceRow) {
    const fromInclude = row.product;
    const fromMap = productMap[row.productId];
    const name = fromInclude?.name ?? fromMap?.name;
    const sku = fromInclude?.sku ?? fromMap?.sku;
    return name ?? sku ?? row.productId ?? '—';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
      };
      const parsed = productPriceCreateSchema.parse(payload);
      await api.post('/product-prices', parsed);
      setIsOpen(false);
      // reload
      const res = await api.get<Paged<PriceRow>>('/product-prices', { params: { productId, page, pageSize } });
      const rows = res.data.items ?? [];
      setItems(rows);
      setTotal(res.data.total ?? rows.length);
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
        'Erreur lors de l\'ajout du prix';
      alert(msg);
      console.error(err);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Tarifs produit</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            placeholder="ProductId (optionnel)"
            value={productId ?? ''}
            onChange={(e) => { setPage(1); setProductId(e.target.value || undefined); }}
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={() => { setErrors({}); setIsOpen(true); setForm(f => ({ ...f, productId: productId ?? '' })); }}
            className="border rounded px-2 py-1 text-sm"
          >
            Nouveau prix
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Produit</th>
              <th className="text-left px-3 py-2">Début</th>
              <th className="text-left px-3 py-2">Fin</th>
              <th className="text-left px-3 py-2">Prix HT</th>
              <th className="text-left px-3 py-2">TVA %</th>
            </tr>
          </thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id} className="border-t">
                <td className="px-3 py-2">{displayProduct(x)}</td>
                <td className="px-3 py-2">{new Date(x.validFrom).toLocaleString()}</td>
                <td className="px-3 py-2">{x.validTo ? new Date(x.validTo).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">{x.priceHT}</td>
                <td className="px-3 py-2">{x.tvaPct}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center opacity-60">Aucun prix</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Modal ajout prix */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-lg">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Nouveau prix</h2>

              <div>
                <label className="block text-sm mb-1">ProductId</label>
                <input
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="border rounded px-2 py-1 w-full"
                />
                {errors.productId && <p className="text-xs text-red-600">{errors.productId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Début</label>
                  <input
                    type="datetime-local"
                    value={toLocalDateTimeInputValue(form.validFrom)}
                    onChange={(e) => setForm({ ...form, validFrom: new Date(e.target.value).toISOString() })}
                    className="border rounded px-2 py-1 w-full"
                  />
                  {errors.validFrom && <p className="text-xs text-red-600">{errors.validFrom}</p>}
                </div>

                <div>
                  <label className="block text-sm mb-1">Fin (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={toLocalDateTimeInputValue(form.validTo)}
                    onChange={(e) => setForm({ ...form, validTo: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="border rounded px-2 py-1 w-full"
                  />
                  {errors.validTo && <p className="text-xs text-red-600">{errors.validTo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Prix HT</label>
                  <input
                    value={form.priceHT}
                    onChange={(e) => setForm({ ...form, priceHT: e.target.value })}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="12.50"
                  />
                  {errors.priceHT && <p className="text-xs text-red-600">{errors.priceHT}</p>}
                </div>
                <div>
                  <label className="block text-sm mb-1">TVA %</label>
                  <input
                    value={form.tvaPct}
                    onChange={(e) => setForm({ ...form, tvaPct: e.target.value })}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="5.50"
                  />
                  {errors.tvaPct && <p className="text-xs text-red-600">{errors.tvaPct}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="border rounded px-3 py-1">
                  Annuler
                </button>
                <button type="submit" className="border rounded px-3 py-1">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
