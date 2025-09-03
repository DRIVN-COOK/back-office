// back-office/src/pages/procurement/PurchaseOrdersPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DataTable,
  type Column,
  POStatus,
} from '@drivn-cook/shared';
import { listPurchaseOrders } from '../../services';
import { api } from '@drivn-cook/shared';

type Row = {
  id: string;
  franchiseeId?: string | null;
  warehouseId?: string | null;
  status: POStatus;
  totalHT?: string | null;   // sera recalculé ci-dessous
  createdAt: string;
  orderedAt?: string | null;
};

type Franchisee = { id: string; name?: string | null; companyName?: string | null; ownerName?: string | null };
type Warehouse  = { id: string; name?: string | null; code?: string | null; city?: string | null };

// lignes & prix pour calcul
type Line = { productId: string; qty: string; unitPriceHT: string };
type Price = { id: string; productId: string; validFrom: string; validTo?: string | null; priceHT: string; tvaPct: string };

function toNum(v: string | number) {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}
function fmtEUR(v?: string | number | null) {
  const n = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number.isFinite(n) ? n : 0);
}
function pickActivePrice(prices: Price[], at: Date): Price | undefined {
  if (!prices.length) return undefined;
  const active = prices.filter(p => {
    const from = new Date(p.validFrom);
    const to   = p.validTo ? new Date(p.validTo) : null;
    return from <= at && (!to || at < to);
  });
  if (active.length) return [...active].sort((a,b)=>+new Date(b.validFrom)-+new Date(a.validFrom))[0];
  const past = prices.filter(p => new Date(p.validFrom) <= at);
  if (past.length) return [...past].sort((a,b)=>+new Date(b.validFrom)-+new Date(a.validFrom))[0];
  return [...prices].sort((a,b)=>+new Date(a.validFrom)-+new Date(b.validFrom))[0];
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<POStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // caches noms
  const [frMap, setFrMap] = useState<Record<string, Franchisee>>({});
  const [whMap, setWhMap] = useState<Record<string, Warehouse>>({});

  // cache des prix par productId
  const [priceCache, setPriceCache] = useState<Record<string, Price[]>>({});

  const STATUS_OPTIONS = Object.values(POStatus) as POStatus[];

  // charge POs
  async function load() {
    setLoading(true);
    try {
      const data = await listPurchaseOrders({
        status: status === 'ALL' ? undefined : status,
        page,
        pageSize,
      });

      const raw = (data.items ?? []) as any[];
      const rows: Row[] = raw.map((x) => ({
        id: String(x.id),
        franchiseeId: x.franchiseeId ?? null,
        warehouseId: x.warehouseId ?? null,
        status: x.status as POStatus,
        // on ignore le total API pour éviter les divergences : on recalcule
        totalHT: null,
        createdAt: x.createdAt ?? new Date().toISOString(),
        orderedAt: x.orderedAt ?? x.createdAt ?? null,
      }));

      setItems(rows);
      setTotal(typeof data.total === 'number' ? data.total : rows.length);

      // Recalcule le total pour les lignes de la page courante
      await computeTotals(rows);
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // noms franchisees/warehouses
  async function hydrateLookups() {
    try {
      const [fr, wh] = await Promise.all([
        api.get<{ items: Franchisee[] }>('/franchisees', { params: { page: 1, pageSize: 100 } }),
        api.get<{ items: Warehouse[]  }>('/warehouses',  { params: { page: 1, pageSize: 100 } }),
      ]);
      const frById: Record<string, Franchisee> = {};
      (fr.data.items ?? []).forEach(f => { frById[f.id] = f; });
      const whById: Record<string, Warehouse> = {};
      (wh.data.items ?? []).forEach(w => { whById[w.id] = w; });
      setFrMap(frById);
      setWhMap(whById);
    } catch (e) {
      console.warn('Impossible de charger les noms franchisees/warehouses', e);
    }
  }

  // recalcul des totaux (lignes + tarif actif)
  async function computeTotals(orders: Row[]) {
    // 1) lignes
    const linesByOrder: Record<string, Line[]> = {};
    await Promise.all(
      orders.map(async (o) => {
                try {
                  const res = await api.get<{ items: Line[] }>(
          '/purchase-order-lines',
          { params: { purchaseOrderId: o.id, page: 1, pageSize: 100 } }
        );
        const lines = res.data.items ?? [];
          linesByOrder[o.id] = [...lines]; // copie mutable
        } catch (e) {
          console.warn('Lignes indisponibles pour', o.id, e);
          linesByOrder[o.id] = [];
        }
      })
    );

    // 2) prix nécessaires
    const productIds = Array.from(new Set(Object.values(linesByOrder).flat().map(l => l.productId).filter(Boolean)));

    // construit un cache local (inclut le state actuel)
    let cache: Record<string, Price[]> = { ...priceCache };

    // fetch prix manquants
    const toFetch = productIds.filter(pid => !cache[pid]);
    if (toFetch.length) {
      const entries = await Promise.all(
        toFetch.map(async (pid): Promise<[string, Price[]]> => {
          try {
            const res = await api.get<{ items: Price[] }>(
              '/product-prices',
              { params: { productId: pid, page: 1, pageSize: 100 } }
            );
            const items = [...(res.data.items ?? [])] as Price[]; // évite readonly
            return [pid, items];
          } catch (e) {
            console.warn('Prix indisponibles pour', pid, e);
            return [pid, []];
          }
        })
      );
      for (const [pid, prices] of entries) cache[pid] = prices;
      // push en state (async) mais on travaille déjà avec `cache`
      setPriceCache(cache);
    }

    // 3) calcule
    const updates: Record<string, string> = {};
    for (const o of orders) {
      const at = new Date(o.orderedAt ?? o.createdAt);
      const lines = linesByOrder[o.id] ?? [];
      const total = lines.reduce((sum, l) => {
        const prices = cache[l.productId] ?? [];
        const picked = pickActivePrice(prices, at);
        const unit = picked ? toNum(picked.priceHT) : toNum(l.unitPriceHT);
        const lineAmt = toNum(l.qty) * (Number.isFinite(unit) ? unit : 0);
        return Number.isFinite(lineAmt) ? sum + lineAmt : sum;
      }, 0);
      updates[o.id] = total.toFixed(2);
    }

    // 4) applique au state
    setItems(prev => prev.map(x => (updates[x.id] ? { ...x, totalHT: updates[x.id] } : x)));
  }

  useEffect(() => { void hydrateLookups(); }, []);
  useEffect(() => { void load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [status, page, pageSize]);

  // Formatters
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString();
  const shortId = (id?: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

  const displayFranchisee = (id?: string | null) => {
    if (!id) return '—';
    const f = frMap[id];
    const label = f?.name || f?.companyName || f?.ownerName;
    return label ? label : shortId(id);
  };

  const displayWarehouse = (id?: string | null) => {
    if (!id) return '—';
    const w = whMap[id];
    const label = w?.name || w?.code || (w?.city ? `Entrepôt ${w.city}` : undefined);
    return label ? label : shortId(id);
  };

  const columns: Column<Row>[] = [
    { header: '#', render: (po) => shortId(po.id), getSortValue: (po) => po.id, width: 'w-28' },
    { header: 'Franchisé', render: (po) => displayFranchisee(po.franchiseeId),
      getSortValue: (po) => {
        const fid = po.franchiseeId ?? '';
        return frMap[fid]?.name ?? frMap[fid]?.companyName ?? fid;
      }, width: 'w-48' },
    { header: 'Entrepôt', render: (po) => displayWarehouse(po.warehouseId),
      getSortValue: (po) => {
        const wid = po.warehouseId ?? '';
        return whMap[wid]?.name ?? whMap[wid]?.code ?? wid;
      }, width: 'w-48' },
    { header: 'Statut', render: (po) => po.status,
      getSortValue: (po) => (Object.values(POStatus) as POStatus[]).indexOf(po.status), width: 'w-40' },
    { header: 'Total HT', render: (po) => fmtEUR(po.totalHT),
      getSortValue: (po) => Number(po.totalHT ?? 0), align: 'right', width: 'w-32' },
    { header: 'Créée le', render: (po) => fmtDateTime(po.createdAt), getSortValue: (po) => po.createdAt, width: 'w-44' },
    { header: 'Actions',
      render: (po) => (
        <div className="text-right">
          <Link to={`/purchase-orders/${po.id}`} className="underline">Ouvrir</Link>
        </div>
      ), align: 'right', width: 'w-28' },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Commandes d’approvisionnement</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value as POStatus | 'ALL'); }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="ALL">Tous statuts</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

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
    </section>
  );
}
