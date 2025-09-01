import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  DataTable,
  type Column,
  type FranchiseAgreement,
} from '@drivn-cook/shared';

import {
  listFranchiseAgreements,
  createFranchiseAgreement,
} from '../../services/franchiseAgreement.service';

type Query = { franchiseeId: string; page: number; pageSize: number };

const EMPTY_FORM = {
  startDate: '',
  endDate: '',
  entryFeeAmount: '50000.00',
  revenueSharePct: '0.0400',
  notes: '',
};

export default function AgreementsPage() {
  const [q, setQ] = useState<Query>({ franchiseeId: '', page: 1, pageSize: 20 });

  const [items, setItems] = useState<FranchiseAgreement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / q.pageSize)),
    [total, q.pageSize]
  );

  async function load() {
    if (!q.franchiseeId) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const data = await listFranchiseAgreements({
        franchiseeId: q.franchiseeId,
        page: q.page,
        pageSize: q.pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.franchiseeId, q.page, q.pageSize]);

  async function onCreateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!q.franchiseeId) return;
    const payload = {
      ...form,
      franchiseeId: q.franchiseeId,
      endDate: form.endDate || undefined,
    };
    await createFranchiseAgreement(payload);
    setIsOpen(false);
    setForm({ ...EMPTY_FORM });
    await load();
  }

  const columns: Column<FranchiseAgreement>[] = [
    {
      header: 'Début',
      render: (a) => new Date(a.startDate).toLocaleDateString(),
      getSortValue: (a) => new Date(a.startDate).getTime(),
      width: 'w-36',
    },
    {
      header: 'Fin',
      render: (a) => (a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'),
      getSortValue: (a) => (a.endDate ? new Date(a.endDate).getTime() : 0),
      width: 'w-36',
    },
    {
      header: "Droit d'entrée (€)",
      render: (a) => a.entryFeeAmount,
      getSortValue: (a) => Number(a.entryFeeAmount),
      width: 'w-40',
      align: 'right',
      thClassName: 'pr-4',
      className: 'pr-4',
    },
    {
      header: 'Redevance (%)',
      render: (a) => `${(Number(a.revenueSharePct) * 100).toFixed(2)}%`,
      getSortValue: (a) => Number(a.revenueSharePct),
      width: 'w-36',
      align: 'right',
    },
    {
      header: 'Notes',
      render: (a) => a.notes || '—',
      getSortValue: (a) => a.notes?.length ?? 0,
      width: 'min-w-[240px]',
    },
    {
      header: 'Créé le',
      render: (a) => new Date(a.createdAt).toLocaleString(),
      getSortValue: (a) => new Date(a.createdAt).getTime(),
      width: 'w-48',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Accords (franchisé)</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q.franchiseeId}
            onChange={(e) => setQ((p) => ({ ...p, page: 1, franchiseeId: e.target.value }))}
            placeholder="FranchiseeId"
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            disabled={!q.franchiseeId}
            onClick={() => setIsOpen(true)}
            className="border rounded px-2 py-1 text-sm"
          >
            Nouvel accord
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">
        {loading ? 'Chargement…' : `Total: ${total}`}
      </div>

      <DataTable
        items={items}
        columns={columns}
        loading={loading}
        page={q.page}
        pageSize={q.pageSize}
        total={total}
        onPageChange={(p) => setQ((prev) => ({ ...prev, page: p }))}
        minTableWidth="min-w-[1000px]"
      />

      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-xl">
        <form onSubmit={onCreateAgreement} className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Nouvel accord</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Début (ISO)</label>
              <input
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                placeholder="2025-01-01"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Fin (ISO, optionnel)</label>
              <input
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                placeholder="2026-01-01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Droit d’entrée (€ HT)</label>
              <input
                value={form.entryFeeAmount}
                onChange={(e) => setForm((p) => ({ ...p, entryFeeAmount: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                placeholder="50000.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Redevance (ex: 0.0400)</label>
              <input
                value={form.revenueSharePct}
                onChange={(e) => setForm((p) => ({ ...p, revenueSharePct: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                placeholder="0.0400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              rows={3}
              placeholder="Infos complémentaires…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className="border rounded px-3 py-1">
              Annuler
            </button>
            <button type="submit" className="border rounded px-3 py-1">
              Créer
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
