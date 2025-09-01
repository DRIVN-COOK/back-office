// back-office/src/pages/sales/OrderDetailPage.tsx
import { useEffect, useState } from 'react';
import {
  Modal,
  OrderStatus,
  Channel,
  PaymentProvider,
  PaymentStatus,
} from '@drivn-cook/shared';
import { useParams } from 'react-router-dom';

// On part du principe que ces services existent déjà dans ton projet.
import {
  getPurchaseOrder,
  updatePurchaseOrder,
  createPayment,
  updatePayment,
  createInvoice,
} from '../../services';

// ---- Types (côté front) ----
type Line = {
  id: string;
  menuItemId: string;
  qty: number;
  unitPriceHT: string; // decimal as string
  tvaPct: string;      // decimal as string
  lineTotalHT: string; // decimal as string
  menuItem?: { name: string };
};

type Payment = {
  id: string;
  provider: PaymentProvider;
  amount: string;           // decimal as string
  status: PaymentStatus;
  paidAt?: string | null;
  transactionRef?: string | null;
  createdAt: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  pdfUrl?: string | null;
};

type Order = {
  id: string;
  status: OrderStatus;
  channel: Channel;
  customerId: string;
  franchiseeId: string;
  truckId?: string | null;
  warehouseId?: string | null;
  scheduledPickupAt?: string | null;
  placedAt: string;

  totalHT: string;   // decimal as string
  totalTVA: string;  // decimal as string
  totalTTC: string;  // decimal as string

  lines: Line[];
  payments: Payment[];
  invoice?: Invoice | null;
};

type PayForm = {
  provider: PaymentProvider;
  amount: string;
  transactionRef?: string;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<PayForm>({
    provider: Object.values(PaymentProvider)[0] as PaymentProvider,
    amount: '',
  });

  const PROVIDERS = Object.values(PaymentProvider) as PaymentProvider[];

  const fmtDateTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString() : '—';
  const fmtMoney = (v?: string | null) =>
    v != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v)) : '—';

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPurchaseOrder(id);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function move(next: OrderStatus) {
    if (!id) return;
    await updatePurchaseOrder(id, { status: next });
    await load();
  }

  async function onCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    // Normalisation simple
    const amount = payForm.amount.trim();
    await createPayment({
      customerOrderId: id,
      provider: payForm.provider,
      amount,
      transactionRef: payForm.transactionRef?.trim() || undefined,
    });
    setIsPayOpen(false);
    await load();
  }

  async function markPaid(p: Payment) {
    await updatePayment(p.id, {
      status: PaymentStatus.PAID,
      paidAt: new Date().toISOString(),
    });
    await load();
  }

  async function onIssueInvoice() {
    if (!id) return;
    await createInvoice({ customerOrderId: id });
    await load();
  }

  if (loading) return null;
  if (!order) return <div className="opacity-60">Introuvable</div>;

  const canInvoice =
    order.status === OrderStatus.FULFILLED &&
    order.payments.some((p) => p.status === PaymentStatus.PAID);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Commande #{order.id.slice(0, 8)}…</h1>
        <span className="px-2 py-1 text-xs rounded border">{order.status}</span>
        <div className="ml-auto text-sm opacity-70">{fmtDateTime(order.placedAt)}</div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Franchisé</div>
          <div className="font-medium">{order.franchiseeId}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Canal</div>
          <div className="font-medium">{order.channel}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Pickup</div>
          <div className="font-medium">{fmtDateTime(order.scheduledPickupAt)}</div>
        </div>
      </div>

      {/* Lignes */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Article</th>
              <th className="text-left px-3 py-2">Qté</th>
              <th className="text-left px-3 py-2">PU HT</th>
              <th className="text-left px-3 py-2">TVA %</th>
              <th className="text-left px-3 py-2">Ligne HT</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{l.menuItem?.name ?? l.menuItemId}</td>
                <td className="px-3 py-2">{l.qty}</td>
                <td className="px-3 py-2">{fmtMoney(l.unitPriceHT)}</td>
                <td className="px-3 py-2">{Number(l.tvaPct).toFixed(2)}%</td>
                <td className="px-3 py-2">{fmtMoney(l.lineTotalHT)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totaux */}
      <div className="flex items-center gap-6 justify-end">
        <div>
          HT: <b>{fmtMoney(order.totalHT)}</b>
        </div>
        <div>
          TVA: <b>{fmtMoney(order.totalTVA)}</b>
        </div>
        <div>
          TTC: <b>{fmtMoney(order.totalTTC)}</b>
        </div>
      </div>

      {/* Paiements */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Paiements</h2>
          <button
            onClick={() => {
              setPayForm({
                provider: PROVIDERS[0],
                amount: order.totalTTC,
              });
              setIsPayOpen(true);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            Ajouter
          </button>
        </div>

        <div className="overflow-x-auto border rounded">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-3 py-2">Fournisseur</th>
                <th className="text-left px-3 py-2">Montant</th>
                <th className="text-left px-3 py-2">Statut</th>
                <th className="text-left px-3 py-2">Réf.</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.provider}</td>
                  <td className="px-3 py-2">{fmtMoney(p.amount)}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">{p.transactionRef ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {p.status !== PaymentStatus.PAID && (
                      <button onClick={() => markPaid(p)} className="underline">
                        Marquer payé
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {order.payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center opacity-60">
                    Aucun paiement
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Facture */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Facture</h2>
          {!order.invoice && (
            <button
              disabled={!canInvoice}
              onClick={onIssueInvoice}
              className="border rounded px-2 py-1 text-sm disabled:opacity-50"
            >
              Émettre la facture
            </button>
          )}
          {order.invoice && order.invoice.pdfUrl && (
            <a className="underline" href={order.invoice.pdfUrl} target="_blank" rel="noreferrer">
              Ouvrir PDF
            </a>
          )}
        </div>
      </section>

      {/* Workflow */}
      <div className="flex items-center gap-2 justify-end">
        {order.status === OrderStatus.PENDING && (
          <>
            <button onClick={() => move(OrderStatus.CONFIRMED)} className="border rounded px-3 py-1">
              Confirmer
            </button>
            <button onClick={() => move(OrderStatus.CANCELLED)} className="border rounded px-3 py-1">
              Annuler
            </button>
          </>
        )}
        {order.status === OrderStatus.CONFIRMED && (
          <button onClick={() => move(OrderStatus.PREPARING)} className="border rounded px-3 py-1">
            Préparer
          </button>
        )}
        {order.status === OrderStatus.PREPARING && (
          <button onClick={() => move(OrderStatus.READY)} className="border rounded px-3 py-1">
            Prête
          </button>
        )}
        {order.status === OrderStatus.READY && (
          <button onClick={() => move(OrderStatus.FULFILLED)} className="border rounded px-3 py-1">
            Livrée/Retirée
          </button>
        )}
      </div>

      {/* Modal paiement */}
      <Modal open={isPayOpen} onClose={() => setIsPayOpen(false)} maxWidth="max-w-md">
        <form onSubmit={onCreatePayment} className="p-4 space-y-3">
          <h3 className="text-lg font-semibold">Ajouter un paiement</h3>

          <div>
            <label className="block text-sm mb-1">Fournisseur</label>
            <select
              value={payForm.provider}
              onChange={(e) =>
                setPayForm((p) => ({ ...p, provider: e.target.value as PaymentProvider }))
              }
              className="border rounded px-2 py-1 w-full"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Montant TTC</label>
            <input
              value={payForm.amount}
              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              placeholder="12.50"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Référence (optionnelle)</label>
            <input
              value={payForm.transactionRef ?? ''}
              onChange={(e) => setPayForm((p) => ({ ...p, transactionRef: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              placeholder="REF-12345"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsPayOpen(false)} className="border rounded px-3 py-1">
              Annuler
            </button>
            <button type="submit" className="border rounded px-3 py-1">
              Ajouter
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
