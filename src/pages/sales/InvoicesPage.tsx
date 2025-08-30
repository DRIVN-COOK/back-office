import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';

type Row = { id:string; customerOrderId:string; invoiceNumber:string; issuedAt:string; pdfUrl?:string|null };

type Paged<T> = { items:T[]; total:number; page:number; pageSize:number };

export default function InvoicesPage(){
  const [q,setQ] = useState({ search:'', page:1, pageSize:20 });
  const [items,setItems] = useState<Row[]>([]);
  const [total,setTotal] = useState(0);
  const [loading,setLoading] = useState(false);

  async function load(){
    setLoading(true);
    try{
      const params = { search: q.search || undefined, page:q.page, pageSize:q.pageSize };
      const res = await api.get<Paged<Row>>('/invoices', { params });
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [q.page,q.pageSize]);

  const pages = useMemo(()=>Math.max(1, Math.ceil(total/q.pageSize)),[total,q.pageSize]);

  async function download(inv: Row){
    if (inv.pdfUrl) { window.open(inv.pdfUrl, '_blank'); return; }
    const res = await api.get(`/invoices/${inv.id}/pdf`, { responseType:'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = `${inv.invoiceNumber}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Factures</h1>
        <div className="ml-auto flex items-center gap-2">
          <input value={q.search} onChange={e=>setQ(p=>({ ...p, search:e.target.value, page:1 }))} placeholder="# facture / orderId" className="border rounded px-2 py-1 text-sm"/>
          <button onClick={()=>setQ(p=>({ ...p }))} className="border rounded px-2 py-1 text-sm">Rechercher</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading?'Chargement…':`Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">Invoice #</th>
            <th className="text-left px-3 py-2">Order</th>
            <th className="text-left px-3 py-2">Émise le</th>
            <th className="text-left px-3 py-2">PDF</th>
          </tr></thead>
          <tbody>
            {items.map(inv=>(
              <tr key={inv.id} className="border-t">
                <td className="px-3 py-2">{inv.invoiceNumber}</td>
                <td className="px-3 py-2">{inv.customerOrderId.slice(0,8)}…</td>
                <td className="px-3 py-2">{new Date(inv.issuedAt).toLocaleString()}</td>
                <td className="px-3 py-2"><button onClick={()=>download(inv)} className="underline">Ouvrir</button></td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={4} className="px-3 py-6 text-center opacity-60">Aucune facture</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={q.page<=1} onClick={()=>setQ(p=>({ ...p, page: Math.max(1,p.page-1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {q.page} / {pages}</span>
        <button disabled={q.page>=pages} onClick={()=>setQ(p=>({ ...p, page: Math.min(pages,p.page+1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>
    </section>
  );
}
