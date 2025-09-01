// back-office/src/pages/warehouses/StockMovementsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  type Column,
  StockMoveType,
} from '@drivn-cook/shared';

// Si tu as déjà un service dédié, dé-commente cette ligne :
import { listStockMovements } from '../../services';

type Row = {
  id: string;
  warehouseId: string;
  productId: string;
  product?: { sku: string; name: string };
  qty: string; // Decimal -> string
  type: StockMoveType;
  refType?: string | null;
  refId?: string | null;
  createdAt: string;
};

export default function StockMovementsPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<StockMoveType | 'ALL'>('ALL');

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const TYPE_OPTIONS = Object.values(StockMoveType) as StockMoveType[];

  async function load() {
    if (!warehouseId) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const data = await listStockMovements({
        warehouseId,
        productId: productId || undefined,
        type: type === 'ALL' ? undefined : type,
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
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, productId, type, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const columns: Column<Row>[] = [
    {
      header: 'Date',
      render: (m) => new Date(m.createdAt).toLocaleString(),
      getSortValue: (m) => m.createdAt,
      width: 'w-[200px]',
    },
    {
      header: 'Entrepôt',
      render: (m) => `${m.warehouseId.slice(0, 8)}…`,
      getSortValue: (m) => m.warehouseId,
      width: 'w-[140px]',
    },
    {
      header: 'Produit',
      render: (m) =>
        `${m.product?.sku ?? m.productId}${m.product?.name ? ` — ${m.product.name}` : ''}`,
      getSortValue: (m) => m.product?.sku ?? m.productId,
      width: 'min-w-[280px]',
    },
    {
      header: 'Qté',
      render: (m) => m.qty,
      getSortValue: (m) => Number(m.qty),
      align: 'right',
      width: 'w-[120px]',
    },
    {
      header: 'Type',
      render: (m) => m.type,
      getSortValue: (m) => TYPE_OPTIONS.indexOf(m.type),
      width: 'w-[160px]',
    },
    {
      header: 'Réf.',
      render: (m) => (m.refType ? `${m.refType} #${m.refId?.slice(0, 8)}…` : '—'),
      getSortValue: (m) => `${m.refType ?? ''}:${m.refId ?? ''}`,
      width: 'w-[220px]',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Mouvements de stock</h1>

        <input
          value={warehouseId}
          onChange={(e) => {
            setPage(1);
            setWarehouseId(e.target.value.trim());
          }}
          placeholder="WarehouseId"
          className="border rounded px-2 py-1 text-sm"
        />

        <input
          value={productId}
          onChange={(e) => {
            setPage(1);
            setProductId(e.target.value.trim());
          }}
          placeholder="ProductId (optionnel)"
          className="border rounded px-2 py-1 text-sm"
        />

        <select
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value as StockMoveType | 'ALL');
          }}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="ALL">Tous types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </header>

      {warehouseId ? (
        <>
          <div className="text-sm opacity-70">
            {loading ? 'Chargement…' : `Total: ${total}`}
          </div>

          <DataTable<Row>
            items={items}
            columns={columns}
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => setPage(p)}
            minTableWidth="min-w-[1100px]"
          />

          {/* Pagination additionnelle (facultative) — DataTable gère déjà la pagination si tu lui fournis total/page/pageSize */}
          <div className="flex items-center gap-2 justify-end">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border rounded px-2 py-1 disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="text-sm">
              Page {page} / {pages}
            </span>
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
        <div className="opacity-60">
          Saisis un <code>WarehouseId</code> pour afficher les mouvements.
        </div>
      )}
    </section>
  );
}
