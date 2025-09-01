import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';

type Card = { id:string; cardNumber:string; customerId:string; points:number; tier:'BASIC'|'SILVER'|'GOLD'; printablePdfUrl?:string|null; createdAt:string };
type Txn = { id:string; type:'EARN'|'SPEND'|'ADJUST'; points:number; createdAt:string; refType?:string|null; refId?:string|null };
type Paged<T> = { items:T[]; total:number; page:number; pageSize:number };

export default function LoyaltyPage(){
  const [search,setSearch] = useState('');
  const [card,setCard] = useState<Card | null>(null);
  const [txns,setTxns] = useState<Txn[]>([]);
  const [loading,setLoading] = useState(false);
  const [page,setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total,setTotal] = useState(0);

  const [isOpen,setIsOpen] = useState(false);
  const [form,setForm] = useState<{ type:'EARN'|'SPEND'|'ADJUST'; points:number; refType?:string; refId?:string }>({ type:'EARN', points:10, refType:'ADMIN', refId:'' });

  async function findCard(){
    setLoading(true);
    try{
      const res = await api.get<Card|undefined>('/loyalty-cards/find', { params:{ q: search }});
      setCard(res.data ?? null);
      setPage(1);
    } finally { setLoading(false); }
  }

  async function loadTxns(){
    if (!card) { setTxns([]); setTotal(0); return; }
    setLoading(true);
    try{
      const res = await api.get<Paged<Txn>>(`/loyalty-transactions/${card.id}`, { params:{ page, pageSize }});
      setTxns(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ loadTxns(); /* eslint-disable-next-line */ }, [card?.id, page, pageSize]);

  const pages = useMemo(()=>Math.max(1, Math.ceil(total/pageSize)),[total, pageSize]);

  async function adjustPoints(e:React.FormEvent){
    e.preventDefault();
    if (!card) return;
    await api.post(`/loyalty-transactions/${card.id}`, form);
    setIsOpen(false); await findCard(); await loadTxns();
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Fidélité</h1>
        <div className="ml-auto flex items-center gap-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="email / customerId / cardNumber" className="border rounded px-2 py-1 text-sm"/>
          <button onClick={findCard} className="border rounded px-2 py-1 text-sm">Rechercher</button>
          {card && <button onClick={()=>setIsOpen(true)} className="border rounded px-2 py-1 text-sm">Ajuster points</button>}
        </div>
      </header>

      {card ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded p-3">
              <div className="text-xs opacity-70">Carte</div>
              <div className="font-medium">{card.cardNumber}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs opacity-70">Points</div>
              <div className="font-medium">{card.points}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs opacity-70">Tier</div>
              <div className="font-medium">{card.tier}</div>
            </div>
          </div>

          <div className="text-sm opacity-70">{loading?'Chargement…':`Transactions: ${total}`}</div>

          <div className="overflow-x-auto border rounded">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="bg-black/5"><tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Points</th>
                <th className="text-left px-3 py-2">Réf</th>
              </tr></thead>
              <tbody>
                {txns.map(t=>(
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{t.type}</td>
                    <td className="px-3 py-2">{t.points}</td>
                    <td className="px-3 py-2">{t.refType}{t.refId ? ` #${t.refId.slice(0,8)}…` : ''}</td>
                  </tr>
                ))}
                {!loading && txns.length===0 && <tr><td colSpan={4} className="px-3 py-6 text-center opacity-60">Aucune transaction</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
            <span className="text-sm">Page {page} / {pages}</span>
            <button disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
          </div>
        </>
      ) : (
        <div className="opacity-60 text-sm">Recherchez une carte pour afficher les détails.</div>
      )}

      {/* Modal ajustement */}
      {isOpen && card && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-md">
            <form onSubmit={adjustPoints} className="p-4 space-y-3">
              <h3 className="text-lg font-semibold">Ajustement de points</h3>
              <div>
                <label className="block text-sm mb-1">Type</label>
                <select value={form.type} onChange={e=>setForm({...form, type:e.target.value as any})} className="border rounded px-2 py-1 w-full">
                  <option value="EARN">EARN</option>
                  <option value="SPEND">SPEND</option>
                  <option value="ADJUST">ADJUST</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Points (+/-)</label>
                <input type="number" value={form.points} onChange={e=>setForm({...form, points:Number(e.target.value||0)})} className="border rounded px-2 py-1 w-full"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">RefType</label><input value={form.refType||''} onChange={e=>setForm({...form, refType:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
                <div><label className="block text-sm mb-1">RefId</label><input value={form.refId||''} onChange={e=>setForm({...form, refId:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setIsOpen(false)} className="border rounded px-3 py-1">Annuler</button>
                <button type="submit" className="border rounded px-3 py-1">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
