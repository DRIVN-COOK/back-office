import { useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import {
  purchaseOrderCreateSchema,
  type PurchaseOrderLineCreate,
  computeRatios,
} from '@drivn-cook/shared';
import { useNavigate } from 'react-router-dom';

type LineForm = PurchaseOrderLineCreate;

export default function CreatePurchaseOrderPage() {
  const [franchiseeId, setFranchiseeId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<LineForm[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nav = useNavigate();

  function addLine() {
    setLines(list => [...list, {
      productId: '',
      qty: '1',
      unitPriceHT: '0.00',
      tvaPct: '5.50',
      isCoreItem: true,
    }]);
  }
  function removeLine(idx: number) {
    setLines(list => list.filter((_, i) => i !== idx));
  }
  function updateLine(idx: number, patch: Partial<LineForm>) {
    setLines(list => list.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  const { coreHT, freeHT, totalHT, corePct, freePct } = computeRatios(lines);
  const warn = corePct < 80;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { franchiseeId, warehouseId, lines };
      purchaseOrderCreateSchema.parse(payload);
      await api.post('/purchase-orders', payload);
      nav('/purchase-orders');
    } catch (err: unknown) {
      // ZodError côté front
      if (err && typeof err === 'object' && 'issues' in (err as any)) {
        const zerr = err as z.ZodError;
        const map: Record<string, string> = {};
        zerr.issues.forEach((issue) => {
          const key = (issue.path?.[0] ?? '') as string;
          if (key) map[key] = issue.message;
        });
        setErrors(map);
        return;
      }

      // Erreur Axios/HTTP
      const anyErr = err as any;
      const msg =
        anyErr?.response?.data?.message ||
        anyErr?.response?.data?.error ||
        anyErr?.message ||
        'création impossible';
      alert(msg);
      console.error(err);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Nouvelle commande d’appro</h1>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">FranchiseeId</label>
            <input value={franchiseeId} onChange={e=>setFranchiseeId(e.target.value)} className="border rounded px-2 py-1 w-full" />
            {errors['franchiseeId'] && <p className="text-xs text-red-600">{errors['franchiseeId']}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1">WarehouseId</label>
            <input value={warehouseId} onChange={e=>setWarehouseId(e.target.value)} className="border rounded px-2 py-1 w-full" />
            {errors['warehouseId'] && <p className="text-xs text-red-600">{errors['warehouseId']}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-medium">Lignes</h2>
          <button type="button" onClick={addLine} className="border rounded px-2 py-1 text-sm">Ajouter une ligne</button>
        </div>

        <div className="overflow-x-auto border rounded">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-3 py-2">Produit</th>
                <th className="text-left px-3 py-2">Qté</th>
                <th className="text-left px-3 py-2">PU HT</th>
                <th className="text-left px-3 py-2">TVA %</th>
                <th className="text-left px-3 py-2">Core (80%)</th>
                <th className="text-left px-3 py-2">Montant HT</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const amt = Number(l.qty.replace(',','.')) * Number(l.unitPriceHT.replace(',','.'));
                return (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">
                      <input value={l.productId} onChange={e=>updateLine(i, { productId: e.target.value })}
                        className="border rounded px-2 py-1 w-[220px]" placeholder="productId" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.qty} onChange={e=>updateLine(i, { qty: e.target.value })}
                        className="border rounded px-2 py-1 w-[100px]" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.unitPriceHT} onChange={e=>updateLine(i, { unitPriceHT: e.target.value })}
                        className="border rounded px-2 py-1 w-[110px]" placeholder="12.50" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={l.tvaPct} onChange={e=>updateLine(i, { tvaPct: e.target.value })}
                        className="border rounded px-2 py-1 w-[90px]" placeholder="5.50" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={l.isCoreItem} onChange={e=>updateLine(i, { isCoreItem: e.target.checked })} />
                    </td>
                    <td className="px-3 py-2">{isFinite(amt) ? amt.toFixed(2) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={()=>removeLine(i)} className="underline text-red-600">Supprimer</button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center opacity-60">Aucune ligne</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`border rounded p-3 ${warn ? 'border-red-500' : 'border-green-600'}`}>
            <div className="text-sm">Répartition</div>
            <div className="text-lg">Core: {corePct.toFixed(1)}% — Free: {freePct.toFixed(1)}%</div>
            {warn && <div className="text-xs text-red-600">⚠️ Core &lt; 80% — L’API refusera probablement la soumission.</div>}
          </div>
          <div className="border rounded p-3">
            <div className="text-sm">Montants HT</div>
            <div className="text-lg">Total: {totalHT.toFixed(2)}</div>
            <div className="text-sm opacity-70">Core: {coreHT.toFixed(2)} • Free: {freeHT.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={()=>nav('/purchase-orders')} className="border rounded px-3 py-1">Annuler</button>
          <button type="submit" className="border rounded px-3 py-1">Créer (brouillon)</button>
        </div>
      </form>
    </section>
  );
}
