import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { api } from '@drivn-cook/shared';
import { royaltyGenerateSchema, type RoyaltyReportDTO } from '@drivn-cook/shared';

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function RoyaltiesPage() {
  const [period, setPeriod] = useState('2025-08'); // YYYY-MM
  const [franchiseeId, setFranchiseeId] = useState('');
  const [items, setItems] = useState<RoyaltyReportDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState<Record<string,string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<RoyaltyReportDTO>>('/reports/royalties', { params: { period, franchiseeId: franchiseeId || undefined, page, pageSize }});
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function generateOne() {
    setErrors({});
    try {
      const payload = royaltyGenerateSchema.parse({ period, franchiseeId: franchiseeId || '' });
      const res = await api.post<RoyaltyReportDTO>('/reports/royalties/generate', payload);
      // Réinjection ou reload
      setItems(prev => [res.data, ...prev]);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        const map: Record<string,string> = {};
        (err as z.ZodError).errors.forEach(e => { if (e.path[0]) map[String(e.path[0])] = e.message; });
        setErrors(map);
      } else { console.error(err); alert("Génération impossible"); }
    }
  }

  async function downloadPdf(r: RoyaltyReportDTO) {
    try {
      if (r.generatedPdfUrl) {
        window.open(r.generatedPdfUrl, '_blank');
      } else {
        // fallback: endpoint qui (re)génère/sert le PDF
        const res = await api.get(`/reports/royalties/${r.id}/pdf`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a'); a.href = url; a.download = `royalty_${r.period}_${r.franchiseeId.slice(0,8)}.pdf`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); alert('PDF indisponible'); }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Redevances 4% (mensuel)</h1>
        <div className="ml-auto grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input value={period} onChange={e=>setPeriod(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="YYYY-MM" />
          <input value={franchiseeId} onChange={e=>setFranchiseeId(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="FranchiseeId (optionnel pour lister)" />
          <div className="flex gap-2">
            <button onClick={()=>{ setPage(1); load(); }} className="border rounded px-2 py-1 text-sm">Rechercher</button>
            <button onClick={generateOne} className="border rounded px-2 py-1 text-sm">Générer (1)</button>
          </div>
        </div>
      </header>

      {(errors.period || errors.franchiseeId) && (
        <div className="text-red-600 text-sm">{errors.period || errors.franchiseeId}</div>
      )}

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Période</th>
              <th className="text-left px-3 py-2">Franchisé</th>
              <th className="text-left px-3 py-2">CA (grossSales)</th>
              <th className="text-left px-3 py-2">% redevance</th>
              <th className="text-left px-3 py-2">Montant dû</th>
              <th className="text-left px-3 py-2">PDF</th>
              <th className="text-left px-3 py-2">Créé le</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.period}</td>
                <td className="px-3 py-2">{r.franchiseeId.slice(0,8)}…</td>
                <td className="px-3 py-2">{r.grossSales}</td>
                <td className="px-3 py-2">{Number(r.sharePct) * 100}%</td>
                <td className="px-3 py-2">{r.amountDue}</td>
                <td className="px-3 py-2">
                  <button onClick={()=>downloadPdf(r)} className="underline">{r.generatedPdfUrl ? 'Ouvrir' : 'Générer'}</button>
                </td>
                <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  {/* Selon besoin: re-générer, envoyer email, marquer payé, etc. */}
                  <button onClick={()=>downloadPdf(r)} className="underline">PDF</button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center opacity-60">Aucun report</td></tr>
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
