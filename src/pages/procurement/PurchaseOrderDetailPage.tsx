// back-office/src/pages/procurement/PurchaseOrderDetailPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DataTable,
  type Column,
  POStatus,
} from '@drivn-cook/shared';

import {
  getPurchaseOrder,
  updatePurchaseOrderStatus,
} from '../../services';

/** Types d'écran (suffisent pour l'affichage ici) */
type Line = {
  id: string;
  productId: string;
  qty: string;         // string ou number côté API → on affiche brut
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

/** helpers */
const toLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const toAmount = (v: string | number) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);

  /** Load */
  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPurchaseOrder(id);
      setPo(data as PO);
    } catch (e) {
      console.error(e);
      setPo(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [id]);

  /** Workflow */
  async function setStatus(next: POStatus) {
    if (!id) return;
    try {
      await updatePurchaseOrderStatus(id, next);
      await load();
    } catch (e) {
      console.error(e);
      alert('Changement de statut impossible.');
    }
  }

  const columns: Column<Line>[] = useMemo<Column<Line>[]>(() => [
    { header: 'Produit',   render: (l) => l.productId, width: 'min-w-[220px]' },
    { header: 'Qté',       render: (l) => l.qty,       width: 'w-28' },
    { header: 'PU HT',     render: (l) => l.unitPriceHT, width: 'w-32' },
    { header: 'TVA %',     render: (l) => l.tvaPct,    width: 'w-24' },
    { header: 'Core',      render: (l) => (l.isCoreItem ? 'Oui' : 'Non'), width: 'w-24' },
    {
      header: 'Montant HT',
      render: (l) => {
        const amt = toAmount(l.qty) * toAmount(l.unitPriceHT);
        return Number.isFinite(amt) ? amt.toFixed(2) : '—';
      },
      width: 'w-36',
      align: 'right',
    },
  ], [],);

  if (loading) return null;
  if (!po) return <div className="opacity-60">Introuvable</div>;

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">PO #{po.id.slice(0, 8)}…</h1>
        <span className="px-2 py-1 text-xs rounded border">{po.status}</span>
        <div className="ml-auto text-sm opacity-70">Créée: {toLocal(po.createdAt)}</div>
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
          <div className="font-medium">
            {po.corePct != null ? `${po.corePct.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      <DataTable
        items={po.lines}
        columns={columns}
        minTableWidth="min-w-[900px]"
      />

      <div className="flex items-center gap-2">
        <div className="ml-auto text-right">
          <div className="text-sm opacity-70">Total HT</div>
          <div className="text-xl font-semibold">{po.totalHT ?? '—'}</div>
        </div>
      </div>

      {/* Workflow simple HQ (via l'enum POStatus) */}
      <div className="flex items-center gap-2 justify-end">
        {po.status === POStatus.DRAFT && (
          <button onClick={() => setStatus(POStatus.SUBMITTED)} className="border rounded px-3 py-1">
            Soumettre
          </button>
        )}
        {po.status === POStatus.SUBMITTED && (
          <>
            <button onClick={() => setStatus(POStatus.PREPARING)} className="border rounded px-3 py-1">
              Valider (Prépa)
            </button>
            <button onClick={() => setStatus(POStatus.CANCELLED)} className="border rounded px-3 py-1">
              Refuser (Annuler)
            </button>
          </>
        )}
        {po.status === POStatus.PREPARING && (
          <button onClick={() => setStatus(POStatus.READY)} className="border rounded px-3 py-1">
            Marquer “Prêt”
          </button>
        )}
        {po.status === POStatus.READY && (
          <button onClick={() => setStatus(POStatus.DELIVERED)} className="border rounded px-3 py-1">
            Marquer “Livré”
          </button>
        )}
      </div>
    </section>
  );
}
