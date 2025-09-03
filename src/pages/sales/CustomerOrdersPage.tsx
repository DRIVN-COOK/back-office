// back-office/src/pages/sales/CustomerOrdersPage.tsx
import { useEffect, useState } from 'react';
import {
  DataTable,
  type Column,
  OrderStatus,
  Channel,
  orderQuerySchema,
} from '@drivn-cook/shared';
import { listCustomerOrders } from '../../services';

type Row = {
  id: string;
  customerId: string;
  franchiseeId: string;
  truckId?: string | null;
  channel: Channel;
  status: OrderStatus;
  placedAt: string;
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
  franchisee?: { name: string };
  truck?: { vin: string } | null;
};

type Query = {
  q?: string;
  status?: OrderStatus | '';
  channel?: Channel | '';
  from?: string;
  to?: string;
  truckId?: string;
  franchiseeId?: string;
  page: number;
  pageSize: number;
};

// ── Libellés FR ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY: 'Prête',
  CANCELLED: 'Annulée',

};
const CHANNEL_LABEL: Partial<Record<Channel, string>> = {
  IN_PERSON: 'Sur place',
   ONLINE_PREORDER: 'En ligne',
};
const statusLabel = (s: OrderStatus) => STATUS_LABEL[s] ?? String(s);
const channelLabel = (c: Channel) => CHANNEL_LABEL[c] ?? String(c);

export default function CustomerOrdersPage() {
  const [q, setQ] = useState<Query>({
    q: '',
    status: '',
    channel: '',
    from: '',
    to: '',
    truckId: '',
    franchiseeId: '',
    page: 1,
    pageSize: 20,
  });

  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const STATUS_OPTIONS = Object.values(OrderStatus) as OrderStatus[];
  const CHANNEL_OPTIONS = Object.values(Channel) as Channel[];

  async function load() {
    setLoading(true);
    try {
      const params = {
        ...q,
        q: q.q || undefined,
        status: q.status || undefined,
        channel: q.channel || undefined,
        truckId: q.truckId || undefined,
        franchiseeId: q.franchiseeId || undefined,
        from: q.from || undefined,
        to: q.to || undefined,
      };
      orderQuerySchema.parse(params);
      const data = await listCustomerOrders(params);
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.page, q.pageSize, q.status, q.channel, q.franchiseeId, q.truckId, q.from, q.to, q.q]);

  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString();
  const fmtMoney = (v: string) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v));

  const columns: Column<Row>[] = [
    { header: '#', render: (o) => `${o.id.slice(0, 8)}…`, getSortValue: (o) => o.id, width: 'w-28' },
    {
      header: 'Canal',
      render: (o) => channelLabel(o.channel),
      getSortValue: (o) => channelLabel(o.channel).toLowerCase(),
      width: 'w-44',
    },
    {
      header: 'Statut',
      render: (o) => statusLabel(o.status),
      getSortValue: (o) => statusLabel(o.status).toLowerCase(),
      width: 'w-44',
    },
    {
      header: 'Franchisé',
      render: (o) => o.franchisee?.name ?? `${o.franchiseeId.slice(0, 8)}…`,
      getSortValue: (o) => o.franchisee?.name ?? o.franchiseeId,
      width: 'w-56',
    },
    {
      header: 'Camion (VIN)',
      render: (o) => o.truck?.vin ?? (o.truckId ? `${o.truckId.slice(0, 8)}…` : '—'),
      getSortValue: (o) => o.truck?.vin ?? o.truckId ?? '',
      width: 'w-56',
    },
    {
      header: 'Placé le',
      render: (o) => fmtDateTime(o.placedAt),
      getSortValue: (o) => o.placedAt,
      width: 'w-44',
    },
    {
      header: 'Total TTC',
      render: (o) => fmtMoney(o.totalTTC),
      getSortValue: (o) => Number(o.totalTTC),
      align: 'right',
      width: 'w-32',
    },
    {
      header: 'Actions',
      render: (o) => (
        <div className="text-right">
          <a
            href={`/api/customer-orders/${o.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Télécharger le PDF
          </a>
        </div>
      ),
      align: 'right',
      width: 'w-40',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Commandes clients</h1>

        <div className="ml-auto grid grid-cols-2 md:grid-cols-7 gap-2">
          <input
            placeholder="Recherche"
            value={q.q ?? ''}
            onChange={(e) => setQ((p) => ({ ...p, q: e.target.value, page: 1 }))}
            className="border rounded px-2 py-1 text-sm"
          />

          <select
            value={q.status ?? ''}
            onChange={(e) => setQ((p) => ({ ...p, status: e.target.value as OrderStatus | '', page: 1 }))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Tous statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>

          <select
            value={q.channel ?? ''}
            onChange={(e) => setQ((p) => ({ ...p, channel: e.target.value as Channel | '', page: 1 }))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Tous canaux</option>
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {channelLabel(c)}
              </option>
            ))}
          </select>

          <button onClick={() => setQ((p) => ({ ...p }))} className="border rounded px-2 py-1 text-sm">
            Filtrer
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <DataTable<Row>
        items={items}
        columns={columns}
        loading={loading}
        page={q.page}
        pageSize={q.pageSize}
        total={total}
        onPageChange={(p) => setQ((prev) => ({ ...prev, page: p }))}
        minTableWidth="min-w-[1100px]"
      />
    </section>
  );
}
