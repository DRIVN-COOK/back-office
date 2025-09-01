// back-office/src/pages/procurement/PurchaseOrdersPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DataTable,
  type Column,
  POStatus,          // <- Enum exporté par le shared
} from '@drivn-cook/shared';

// On part du principe que tu as déjà le service.
import { listPurchaseOrders } from '../../services';

type Row = {
  id: string;
  franchiseeId: string;
  warehouseId: string;
  status: POStatus;
  corePct?: number | null;   // 0..1 côté API si calculé
  totalHT?: string | null;   // Decimal string
  createdAt: string;
};

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<POStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const STATUS_OPTIONS = Object.values(POStatus) as POStatus[];

  async function load() {
    setLoading(true);
    try {
      const data = await listPurchaseOrders({
        status: status === 'ALL' ? undefined : status,
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
  }, [status, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Formatters
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString();
  const fmtMoney = (v?: string | null) =>
    v != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v)) : '—';
  const fmtPct = (p?: number | null) => (p != null ? `${(p * 100).toFixed(1)}%` : '—');

  // Colonnes DataTable
  const columns: Column<Row>[] = [
    { header: '#', render: (po) => `${po.id.slice(0, 8)}…`, getSortValue: (po) => po.id, width: 'w-28' },
    { header: 'Franchisé', render: (po) => `${po.franchiseeId.slice(0, 8)}…`, getSortValue: (po) => po.franchiseeId, width: 'w-36' },
    { header: 'Entrepôt', render: (po) => `${po.warehouseId.slice(0, 8)}…`, getSortValue: (po) => po.warehouseId, width: 'w-36' },
    {
      header: 'Statut',
      render: (po) => po.status,
      getSortValue: (po) => STATUS_OPTIONS.indexOf(po.status),
      width: 'w-40',
    },
    {
      header: 'Core %',
      render: (po) => fmtPct(po.corePct),
      getSortValue: (po) => Number(((po.corePct ?? 0) * 100).toFixed(1)),
      align: 'right',
      width: 'w-28',
    },
    {
      header: 'Total HT',
      render: (po) => fmtMoney(po.totalHT),
      getSortValue: (po) => Number(po.totalHT ?? 0),
      align: 'right',
      width: 'w-32',
    },
    {
      header: 'Créée le',
      render: (po) => fmtDateTime(po.createdAt),
      getSortValue: (po) => po.createdAt,
      width: 'w-44',
    },
    {
      header: 'Actions',
      render: (po) => (
        <div className="text-right">
          <Link to={`/purchase-orders/${po.id}`} className="underline">
            Ouvrir
          </Link>
        </div>
      ),
      align: 'right',
      width: 'w-28',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Commandes d’approvisionnement</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as POStatus | 'ALL');
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="ALL">Tous statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={() => navigate('/purchase-orders/new')}
            className="border rounded px-2 py-1 text-sm"
          >
            Nouvelle commande
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <DataTable<Row>
        items={items}
        columns={columns}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        minTableWidth="min-w-[1000px]"
      />

      {/* Pagination secondaire (facultative) */}
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
    </section>
  );
}
