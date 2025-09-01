import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { salesQuerySchema, type SalesQuery, type SalesSummaryDTO } from '@drivn-cook/shared';

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function SalesReportsPage() {
  const [from, setFrom] = useState('2025-07');
  const [to, setTo] = useState('2025-08');
  const [granularity, setGranularity] = useState<'month'|'day'>('month');
  const [franchiseeId, setFranchiseeId] = useState('');
  const [items, setItems] = useState<SalesSummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState<Record<string,string>>({});

  async function load() {
    setLoading(true);
    setErrors({});
    try {
      const query: SalesQuery = { from, to, granularity, franchiseeId: franchiseeId || undefined };
      salesQuerySchema.parse(query);
      const res = await api.get<Paged<SalesSummaryDTO>>('/sales-summaries', { params: { ...query, page, pageSize } });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
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
        } else {
          console.error(err);
          setItems([]); setTotal(0);
        }
      } finally { setLoading(false); }
        return;
    }


  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function exportCsv() {
    try {
      const res = await api.get('/revenue-share-reports', {
        params: { from, to, granularity, franchiseeId: franchiseeId || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `sales_${from}_${to}_${granularity}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert('Export CSV impossible'); }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Reporting — Ventes</h1>
        <div className="ml-auto grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="From (YYYY-MM ou YYYY-MM-DD)"/>
          <input value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="To (YYYY-MM ou YYYY-MM-DD)"/>
          <select value={granularity} onChange={e=>setGranularity(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
            <option value="month">Mensuel</option>
            <option value="day">Quotidien</option>
          </select>
          <input value={franchiseeId} onChange={e=>setFranchiseeId(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="FranchiseeId (optionnel)"/>
          <button onClick={()=>{ setPage(1); load(); }} className="border rounded px-2 py-1 text-sm">Appliquer</button>
        </div>
      </header>

      {(errors.from || errors.to) && (
        <div className="text-red-600 text-sm">{errors.from || errors.to}</div>
      )}

      <div className="flex items-center gap-2">
        <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>
        <div className="ml-auto"><button onClick={exportCsv} className="border rounded px-2 py-1 text-sm">Exporter CSV</button></div>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Période</th>
              <th className="text-left px-3 py-2">Franchisé</th>
              <th className="text-left px-3 py-2">CA HT</th>
              <th className="text-left px-3 py-2">TVA</th>
              <th className="text-left px-3 py-2">TTC</th>
              <th className="text-left px-3 py-2">Cmdes</th>
              <th className="text-left px-3 py-2">Généré le</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.period}</td>
                <td className="px-3 py-2">{r.franchiseeId.slice(0,8)}…</td>
                <td className="px-3 py-2">{r.grossHT}</td>
                <td className="px-3 py-2">{r.grossTVA}</td>
                <td className="px-3 py-2">{r.grossTTC}</td>
                <td className="px-3 py-2">{r.ordersCount}</td>
                <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center opacity-60">Aucune donnée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {page} / {pages}</span>
        <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>
    </section>
  );
}
