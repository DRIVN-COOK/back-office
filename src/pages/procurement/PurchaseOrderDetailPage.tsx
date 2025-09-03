// back-office/src/pages/procurement/PurchaseOrderDetailPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  api,
  DataTable,
  type Column,
  POStatus,
  type PurchaseOrder,
} from '@drivn-cook/shared';

import {
  getPurchaseOrder,
  updatePurchaseOrder, // <- on n'utilise que cette fonction
} from '../../services';

/** Types d'écran */
type Line = {
  id: string;
  productId: string;
  qty: string;         // string/number côté API → on affiche brut
  unitPriceHT: string; // souvent "1" aujourd'hui → on remplace par le tarif
  tvaPct: string;
  isCoreItem: boolean;
};

type PO = {
  id: string;
  franchiseeId?: string | null;
  warehouseId?: string | null;
  status: POStatus;
  lines: Line[];
  corePct?: number | null;   // on ne l’affiche plus
  totalHT?: string | null;   // si absent, on recalcule
  orderedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

// Lookups légers
type Franchisee = { id: string; name?: string | null; companyName?: string | null; ownerName?: string | null };
type Warehouse  = { id: string; name?: string | null; code?: string | null; city?: string | null };
type Product    = { id: string; name: string; sku: string };

// Prix produit
type Price = {
  id: string;
  productId: string;
  validFrom: string;         // ISO
  validTo?: string | null;   // ISO ou null
  priceHT: string;           // string décimale
  tvaPct: string;            // string décimale
};

/** helpers */
const toLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const toNum = (v: string | number) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
const fmtEUR = (n?: number | null) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n ?? 0));

/** Choisir le prix actif à la date "at" */
function pickActivePrice(prices: Price[], at: Date): Price | undefined {
  if (!prices.length) return undefined;
  // d'abord ceux dont la période couvre "at"
  const active = prices.filter(p => {
    const from = new Date(p.validFrom);
    const to   = p.validTo ? new Date(p.validTo) : null;
    return from <= at && (!to || at < to);
  });
  if (active.length) {
    // si plusieurs, on garde le plus récent
    return active.sort((a, b) => +new Date(b.validFrom) - +new Date(a.validFrom))[0];
  }
  // sinon, dernier prix avant "at"
  const past = prices.filter(p => new Date(p.validFrom) <= at);
  if (past.length) {
    return past.sort((a, b) => +new Date(b.validFrom) - +new Date(a.validFrom))[0];
  }
  // sinon, prix le plus ancien (fallback)
  return prices.sort((a, b) => +new Date(a.validFrom) - +new Date(b.validFrom))[0];
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // lookups
  const [frMap, setFrMap] = useState<Record<string, Franchisee>>({});
  const [whMap, setWhMap] = useState<Record<string, Warehouse>>({});
  const [prodMap, setProdMap] = useState<Record<string, Product>>({});

  // prix actifs par productId
  const [priceMap, setPriceMap] = useState<Record<string, { priceHT: number; tvaPct: number }>>({});

  /** Load PO */
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

  /** Changer de statut via updatePurchaseOrder */
  const changeStatus = async (next: POStatus) => {
    if (!po) return;
    setSaving(true);
    try {
      await updatePurchaseOrder(po.id, { status: next });
      await load();
    } finally {
      setSaving(false);
    }
  };

  /** Hydratation lookups (simple) */
  useEffect(() => {
    (async () => {
      try {
        const [fr, wh, pr] = await Promise.all([
          api.get<{ items: Franchisee[] }>('/franchisees', { params: { page: 1, pageSize: 100 } }),
          api.get<{ items: Warehouse[]  }>('/warehouses',  { params: { page: 1, pageSize: 100 } }),
          api.get<{ items: Product[]    }>('/products',    { params: { page: 1, pageSize: 100 } }),
        ]);
        const fById: Record<string, Franchisee> = {};
        (fr.data.items ?? []).forEach(f => { fById[f.id] = f; });
        const wById: Record<string, Warehouse> = {};
        (wh.data.items ?? []).forEach(w => { wById[w.id] = w; });
        const pById: Record<string, Product> = {};
        (pr.data.items ?? []).forEach(p => { pById[p.id] = p; });
        setFrMap(fById);
        setWhMap(wById);
        setProdMap(pById);
      } catch (e) {
        console.warn('Lookups non chargés :', e);
      }
    })();
  }, []);

  /** Hydrate les prix pour les produits de la commande */
  useEffect(() => {
    (async () => {
      if (!po) return;
      const at = new Date(po.orderedAt ?? po.createdAt);
      const productIds = Array.from(new Set(po.lines.map(l => l.productId))).filter(Boolean);

      // Récupérer les prix par produit (simple et robuste).
      // Si ton API permet /product-prices?ids=... on pourra optimiser.
      const entries = await Promise.all(
        productIds.map(async (pid) => {
          try {
            const res = await api.get<{ items: Price[] }>('/product-prices', {
              params: { productId: pid, page: 1, pageSize: 100 },
            });
            const chosen = pickActivePrice(res.data.items ?? [], at);
            if (!chosen) return [pid, undefined] as const;
            return [pid, { priceHT: toNum(chosen.priceHT), tvaPct: toNum(chosen.tvaPct) }] as const;
          } catch (e) {
            console.warn('Impossible de charger le prix pour', pid, e);
            return [pid, undefined] as const;
          }
        })
      );

      const map: Record<string, { priceHT: number; tvaPct: number }> = {};
      for (const [pid, val] of entries) {
        if (pid && val && Number.isFinite(val.priceHT)) map[pid] = val;
      }
      setPriceMap(map);
    })();
  }, [po]);

  /** Affichages “jolis” */
  const shortId = (s?: string | null) => (s ? `${s.slice(0, 8)}…` : '—');

  const displayFranchisee = (fid?: string | null) => {
    if (!fid) return '—';
    const f = frMap[fid];
    return f?.name || f?.companyName || f?.ownerName || shortId(fid);
  };

  const displayWarehouse = (wid?: string | null) => {
    if (!wid) return '—';
    const w = whMap[wid];
    return w?.name || w?.code || (w?.city ? `Entrepôt ${w.city}` : shortId(wid)) || shortId(wid);
  };

  const displayProduct = (pid: string) => {
    const p = prodMap[pid];
    return p?.name || p?.sku || pid;
  };

  /** Helpers prix ligne */
  const getLineUnitPrice = (l: Line) => {
    const priced = priceMap[l.productId];
    if (priced && Number.isFinite(priced.priceHT)) return priced.priceHT;
    // fallback backend si correct (mais chez toi c’est "1")
    const n = toNum(l.unitPriceHT);
    return Number.isFinite(n) ? n : 0;
  };
  const getLineTvaPct = (l: Line) => {
    const priced = priceMap[l.productId];
    if (priced && Number.isFinite(priced.tvaPct)) return priced.tvaPct;
    const n = toNum(l.tvaPct);
    return Number.isFinite(n) ? n : 0;
  };

  /** Colonnes du tableau — Core retiré, PU renommé et basé sur le tarif */
  const columns: Column<Line>[] = useMemo<Column<Line>[]>(() => [
    { header: 'Produit',          render: (l) => displayProduct(l.productId), width: 'min-w-[240px]' },
    { header: 'Qté',              render: (l) => l.qty,       width: 'w-24' },
    { header: 'Prix unitaire HT', render: (l) => getLineUnitPrice(l).toFixed(2), width: 'w-36' },
    { header: 'TVA %',            render: (l) => getLineTvaPct(l).toFixed(2),    width: 'w-24' },
    {
      header: 'Montant HT',
      render: (l) => {
        const amt = toNum(l.qty) * getLineUnitPrice(l);
        return Number.isFinite(amt) ? fmtEUR(amt) : '—';
      },
      width: 'w-36',
      align: 'right',
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [prodMap, priceMap]);

  /** Total HT : API prioritaire, sinon somme avec tarifs */
  const computedTotalHT = useMemo(() => {
    if (!po) return 0;
    if (po.totalHT != null) return Number(po.totalHT);
    const sum = po.lines.reduce((acc, l) => {
      const line = toNum(l.qty) * getLineUnitPrice(l);
      return Number.isFinite(line) ? acc + line : acc;
    }, 0);
    return sum;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po, priceMap]);

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
          <div className="font-medium">{displayFranchisee(po.franchiseeId)}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs opacity-70">Entrepôt</div>
          <div className="font-medium">{displayWarehouse(po.warehouseId)}</div>
        </div>
        {/* Bloc Core % supprimé */}
      </div>

      <DataTable
        items={po.lines}
        columns={columns}
        minTableWidth="min-w-[900px]"
      />

      <div className="flex items-center gap-2">
        <div className="ml-auto text-right">
          <div className="text-sm opacity-70">Total HT</div>
          <div className="text-xl font-semibold">{fmtEUR(computedTotalHT)}</div>
        </div>
      </div>

      {/* Workflow simple HQ (via l'enum POStatus) */}
      <div className="flex items-center gap-2 justify-end" aria-busy={saving}>
        {po.status === POStatus.DRAFT && (
          <button
            disabled={saving}
            onClick={() => changeStatus(POStatus.SUBMITTED)}
            className="border rounded px-3 py-1 disabled:opacity-60"
          >
            Soumettre
          </button>
        )}
        {po.status === POStatus.SUBMITTED && (
          <>
            <button
              disabled={saving}
              onClick={() => changeStatus(POStatus.PREPARING)}
              className="border rounded px-3 py-1 disabled:opacity-60"
            >
              Valider (Prépa)
            </button>
            <button
              disabled={saving}
              onClick={() => changeStatus(POStatus.CANCELLED)}
              className="border rounded px-3 py-1 disabled:opacity-60"
            >
              Refuser (Annuler)
            </button>
          </>
        )}
        {po.status === POStatus.PREPARING && (
          <button
            disabled={saving}
            onClick={() => changeStatus(POStatus.READY)}
            className="border rounded px-3 py-1 disabled:opacity-60"
          >
            Marquer “Prêt”
          </button>
        )}
        {po.status === POStatus.READY && (
          <button
            disabled={saving}
            onClick={() => changeStatus(POStatus.DELIVERED)}
            className="border rounded px-3 py-1 disabled:opacity-60"
          >
            Marquer “Livré”
          </button>
        )}
      </div>
    </section>
  );
}
