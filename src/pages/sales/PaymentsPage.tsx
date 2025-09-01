// back-office/src/pages/sales/PaymentsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  type Column,
  PaymentProvider,
  PaymentStatus,
} from '@drivn-cook/shared';

// On part du principe que ces services existent déjà.
import { listPayments, updatePayment } from '../../services';

type Row = {
  id: string;
  customerOrderId: string;
  provider: PaymentProvider;
  amount: string;           // decimal as string
  status: PaymentStatus;
  paidAt?: string | null;
  createdAt: string;
};

type Query = {
  provider?: PaymentProvider | '';
  status?: PaymentStatus | '';
  page: number;
  pageSize: number;
};

export default function PaymentsPage() {
  const [q, setQ] = useState<Query>({ provider: '', status: '', page: 1, pageSize: 50 });
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const PROVIDERS = Object.values(PaymentProvider) as PaymentProvider[];
  const STATUSES = Object.values(PaymentStatus) as PaymentStatus[];

  const fmtMoney = (v: string) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v));
  const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

  async function load() {
    setLoading(true);
    try {
      const params = {
        provider: q.provider || undefined,
        status: q.status || undefined,
        page: q.page,
        pageSize: q.pageSize,
      };
      const data = await listPayments(params);
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.page, q.pageSize, q.provider, q.status]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / q.pageSize)), [total, q.pageSize]);

  async function markPaid(id: string) {
    await updatePayment(id, { status: PaymentStatus.PAID, paidAt: new Date().toISOString() });
    await load();
  }

  const columns: Column<Row>[] = [
    { header: 'Order', render: (p) => `${p.customerOrderId.slice(0, 8)}…`, getSortValue: (p) => p.customerOrderId, width: 'w-28' },
    { header: 'Provider', render: (p) => p.provider, getSortValue: (p) => PROVIDERS.indexOf(p.provider), width: 'w-40' },
    { header: 'Montant', render: (p) => fmtMoney(p.amount), getSortValue: (p) => Number(p.amount), align: 'right', width: 'w-28' },
    { header: 'Statut', render: (p) => p.status, getSortValue: (p) => STATUSES.indexOf(p.status), width: 'w-32' },
    { header: 'Payé le', render: (p) => fmtDateTime(p.paidAt), getSortValue: (p) => p.paidAt ?? '', width: 'w-44' },
    {
      header: 'Actions',
      render: (p) => (
        <div className="text-right">
          {p.status !== PaymentStatus.PAID && (
            <button onClick={() => markPaid(p.id)} className="underline">
              Marquer payé
            </button>
          )}
        </div>
      ),
      align: 'right',
      width: 'w-32',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Paiements</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={q.provider ?? ''}
            onChange={(e) => setQ((p) => ({ ...p, provider: e.target.value as PaymentProvider | '', page: 1 }))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Tous</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={q.status ?? ''}
            onChange={(e) => setQ((p) => ({ ...p, status: e.target.value as PaymentStatus | '', page: 1 }))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Tous statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
        minTableWidth="min-w-[900px]"
      />

      <div className="flex items-center gap-2 justify-end">
        <button
          disabled={q.page <= 1}
          onClick={() => setQ((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="text-sm">
          Page {q.page} / {pages}
        </span>
        <button
          disabled={q.page >= pages}
          onClick={() => setQ((p) => ({ ...p, page: Math.min(pages, p.page + 1) }))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Suivant
        </button>
      </div>
    </section>
  );
}
