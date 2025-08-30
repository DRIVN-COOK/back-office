import { useEffect, useState } from 'react';
import { api } from '@drivn-cook/shared';
import { useParams } from 'react-router-dom';
import { PO_STATUS, type POStatus } from '@drivn-cook/shared';

type Line = {
  id: string;
  productId: string;
  qty: string;         // côté API: string ou number -> on affiche
  unitPriceHT: string; // idem
  tvaPct: string;
  isCoreItem: boolean;
};

type PO = {
  id: string;
  franchiseeId: string;
  warehouseId: string;
  status: POStatus;
  lines: Line[];
  corePct?: number | null;
  totalHT?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<PO>(`/purchase-orders/${id}`);
      setPo(res.data);
    } catch (e) {
      console.error(e);
      setPo(null);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  async function setStatus(next: POStatus) {
    if (!id) return;
    try {
      await api.put(`/purchase-orders/${id}/status`, { status: next });
      await load();
    } catch (e) {
      console.error(e);
      alert('Changement de statut impossible.');
    }
  }

  if (loading) return null;
  if (!po) return <div className="opacity-60">Introuvable</div>;

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">PO #{po.id.slice(0,8)}…</h1>
        <span className="px-2 py-1 text-xs rounded border">{po.status}</span>
        <div className="ml-auto text-sm opacity-70">Créée: {new Date(po.createdAt).toLocaleString()}</div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Franchisé</div>
          <div className="font-medium">{po.franchiseeId}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Entrepôt</div>
          <div className="font-medium">{po.warehouseId}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Core %</div>
          <div className="font-medium">{po.corePct != null ? `${po.corePct.toFixed(1)}%` : '—'}</div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Produit</th>
              <th className="text-left px-3 py-2">Qté</th>
              <th className="text-left px-3 py-2">PU HT</th>
              <th className="text-left px-3 py-2">TVA %</th>
              <th className="text-left px-3 py-2">Core</th>
              <th className="text-left px-3 py-2">Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map(l => {
              const amt = Number(String(l.qty).replace(',','.')) * Number(String(l.unitPriceHT).replace(',','.'));
              return (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.productId}</td>
                  <td className="px-3 py-2">{l.qty}</td>
                  <td className="px-3 py-2">{l.unitPriceHT}</td>
                  <td className="px-3 py-2">{l.tvaPct}</td>
                  <td className="px-3 py-2">{l.isCoreItem ? 'Oui' : 'Non'}</td>
                  <td className="px-3 py-2">{isFinite(amt) ? amt.toFixed(2) : '—'}</td>
                </tr>
              );
            })}
            {po.lines.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucune ligne</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <div className="ml-auto text-right">
          <div className="text-sm opacity-70">Total HT</div>
          <div className="text-xl font-semibold">{po.totalHT ?? '—'}</div>
        </div>
      </div>

      {/* Workflow simple HQ */}
      <div className="flex items-center gap-2 justify-end">
        {po.status === 'DRAFT' && (
          <button onClick={()=>setStatus('SUBMITTED')} className="border rounded px-3 py-1">Soumettre</button>
        )}
        {po.status === 'SUBMITTED' && (
          <>
            <button onClick={()=>setStatus('PREPARING')} className="border rounded px-3 py-1">Valider (Prépa)</button>
            <button onClick={()=>setStatus('CANCELLED')} className="border rounded px-3 py-1">Refuser (Annuler)</button>
          </>
        )}
        {po.status === 'PREPARING' && (
          <button onClick={()=>setStatus('READY')} className="border rounded px-3 py-1">Marquer “Prêt”</button>
        )}
        {po.status === 'READY' && (
          <button onClick={()=>setStatus('DELIVERED')} className="border rounded px-3 py-1">Marquer “Livré”</button>
        )}
      </div>
    </section>
  );
}
