import { useEffect, useState } from 'react';
import { api } from '@drivn-cook/shared';
import { ORDER_STATUS } from '@drivn-cook/shared';
import { PAYMENT_PROVIDER, PAYMENT_STATUS } from '@drivn-cook/shared';
import { useParams } from 'react-router-dom';

type Line = { id:string; menuItemId:string; qty:number; unitPriceHT:string; tvaPct:string; lineTotalHT:string; menuItem?: { name:string } };
type Payment = { id:string; provider:string; amount:string; status:string; paidAt?:string|null; transactionRef?:string|null; createdAt:string };
type Invoice = { id:string; invoiceNumber:string; issuedAt:string; pdfUrl?:string|null };

type Order = {
  id: string; status: string; channel: string;
  customerId: string; franchiseeId: string; truckId?:string|null; warehouseId?:string|null;
  scheduledPickupAt?: string | null; placedAt: string;
  totalHT: string; totalTVA: string; totalTTC: string;
  lines: Line[]; payments: Payment[]; invoice?: Invoice | null;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ provider: PAYMENT_PROVIDER[0], amount: '' });

  async function load() {
    setLoading(true);
    try { const res = await api.get<Order>(`/orders/${id}`); setOrder(res.data); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, [id]);

  async function move(next: string) {
    await api.put(`/orders/${id}/status`, { status: next });
    await load();
  }

  async function createPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    await api.post(`/payments`, { customerOrderId: id, provider: payForm.provider, amount: payForm.amount });
    setIsPayOpen(false);
    await load();
  }

  async function markPaid(p: Payment) {
    await api.put(`/payments/${p.id}`, { status: 'PAID', paidAt: new Date().toISOString() });
    await load();
  }

  async function issueInvoice() {
    if (!id) return;
    await api.post(`/invoices`, { customerOrderId: id });
    await load();
  }

  if (loading) return null;
  if (!order) return <div className="opacity-60">Introuvable</div>;

  const canInvoice = order.status === 'FULFILLED' && order.payments.some(p=>p.status==='PAID');

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Commande #{order.id.slice(0,8)}…</h1>
        <span className="px-2 py-1 text-xs rounded border">{order.status}</span>
        <div className="ml-auto text-sm opacity-70">{new Date(order.placedAt).toLocaleString()}</div>
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
          <div className="font-medium">{order.scheduledPickupAt ? new Date(order.scheduledPickupAt).toLocaleString() : '—'}</div>
        </div>
      </div>

      {/* Lignes */}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">Article</th>
            <th className="text-left px-3 py-2">Qté</th>
            <th className="text-left px-3 py-2">PU HT</th>
            <th className="text-left px-3 py-2">TVA %</th>
            <th className="text-left px-3 py-2">Ligne HT</th>
          </tr></thead>
          <tbody>
            {order.lines.map(l=>(
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{l.menuItem?.name ?? l.menuItemId}</td>
                <td className="px-3 py-2">{l.qty}</td>
                <td className="px-3 py-2">{l.unitPriceHT}</td>
                <td className="px-3 py-2">{l.tvaPct}</td>
                <td className="px-3 py-2">{l.lineTotalHT}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totaux */}
      <div className="flex items-center gap-6 justify-end">
        <div>HT: <b>{order.totalHT}</b></div>
        <div>TVA: <b>{order.totalTVA}</b></div>
        <div>TTC: <b>{order.totalTTC}</b></div>
      </div>

      {/* Paiements */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Paiements</h2>
          <button onClick={()=>{ setPayForm({ provider: PAYMENT_PROVIDER[0], amount: order.totalTTC }); setIsPayOpen(true); }} className="border rounded px-2 py-1 text-sm">Ajouter</button>
        </div>
        <div className="overflow-x-auto border rounded">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-black/5"><tr>
              <th className="text-left px-3 py-2">Fournisseur</th>
              <th className="text-left px-3 py-2">Montant</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Réf.</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr></thead>
            <tbody>
              {order.payments.map(p=>(
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.provider}</td>
                  <td className="px-3 py-2">{p.amount}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">{p.transactionRef ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {p.status !== 'PAID' && <button onClick={()=>markPaid(p)} className="underline">Marquer payé</button>}
                  </td>
                </tr>
              ))}
              {order.payments.length===0 && <tr><td colSpan={5} className="px-3 py-6 text-center opacity-60">Aucun paiement</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Facture */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">Facture</h2>
          {!order.invoice && <button disabled={!canInvoice} onClick={issueInvoice} className="border rounded px-2 py-1 text-sm disabled:opacity-50">Émettre la facture</button>}
          {order.invoice && <a className="underline" href={order.invoice.pdfUrl ?? '#'} target="_blank" rel="noreferrer">Ouvrir PDF</a>}
        </div>
      </section>

      {/* Workflow */}
      <div className="flex items-center gap-2 justify-end">
        {order.status==='PENDING' && (
          <>
            <button onClick={()=>move('CONFIRMED')} className="border rounded px-3 py-1">Confirmer</button>
            <button onClick={()=>move('CANCELLED')} className="border rounded px-3 py-1">Annuler</button>
          </>
        )}
        {order.status==='CONFIRMED' && <button onClick={()=>move('PREPARING')} className="border rounded px-3 py-1">Préparer</button>}
        {order.status==='PREPARING' && <button onClick={()=>move('READY')} className="border rounded px-3 py-1">Prête</button>}
        {order.status==='READY' && <button onClick={()=>move('FULFILLED')} className="border rounded px-3 py-1">Livrée/Retirée</button>}
      </div>

      {/* Modal paiement */}
      {isPayOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-md">
            <form onSubmit={createPayment} className="p-4 space-y-3">
              <h3 className="text-lg font-semibold">Ajouter un paiement</h3>
              <div>
                <label className="block text-sm mb-1">Fournisseur</label>
                <select value={payForm.provider} onChange={e=>setPayForm({...payForm, provider: e.target.value})} className="border rounded px-2 py-1 w-full">
                  {PAYMENT_PROVIDER.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Montant TTC</label>
                <input value={payForm.amount} onChange={e=>setPayForm({...payForm, amount: e.target.value})} className="border rounded px-2 py-1 w-full" placeholder="12.50"/>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setIsPayOpen(false)} className="border rounded px-3 py-1">Annuler</button>
                <button type="submit" className="border rounded px-3 py-1">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
