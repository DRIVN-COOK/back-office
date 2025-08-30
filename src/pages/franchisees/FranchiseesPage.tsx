import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';

type Row = {
  id:string; name:string; siren:string; contactEmail?:string|null; contactPhone?:string|null;
  billingAddress?:string|null; defaultWarehouseId?:string|null; active:boolean; createdAt:string;
};

type Paged<T> = { items:T[]; total:number; page:number; pageSize:number };

export default function FranchiseesPage(){
  const [q,setQ] = useState({ search:'', onlyInactive:false, page:1, pageSize:20 });
  const [items,setItems] = useState<Row[]>([]);
  const [total,setTotal] = useState(0);
  const [loading,setLoading] = useState(false);

  const [isOpen,setIsOpen] = useState(false);
  const [editing,setEditing] = useState<Row|null>(null);
  const [form,setForm] = useState({ name:'', siren:'', contactEmail:'', contactPhone:'', billingAddress:'', defaultWarehouseId:'', active:true });

  async function load(){
    setLoading(true);
    try{
      const res = await api.get<Paged<Row>>('/franchisees', { params: { search:q.search||undefined, inactive:q.onlyInactive||undefined, page:q.page, pageSize:q.pageSize }});
      setItems(res.data.items ?? []); setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [q.page, q.pageSize]);

  const pages = useMemo(()=>Math.max(1, Math.ceil(total/q.pageSize)), [total, q.pageSize]);

  function openCreate(){ setEditing(null); setForm({ name:'', siren:'', contactEmail:'', contactPhone:'', billingAddress:'', defaultWarehouseId:'', active:true }); setIsOpen(true); }
  function openEdit(f:Row){ setEditing(f); setForm({ name:f.name, siren:f.siren, contactEmail:f.contactEmail||'', contactPhone:f.contactPhone||'', billingAddress:f.billingAddress||'', defaultWarehouseId:f.defaultWarehouseId||'', active:f.active }); setIsOpen(true); }

  async function submit(e:React.FormEvent){
    e.preventDefault();
    const payload = { ...form, defaultWarehouseId: form.defaultWarehouseId || undefined };
    if (editing) await api.put(`/franchisees/${editing.id}`, payload);
    else await api.post(`/franchisees`, payload);
    setIsOpen(false); setQ(p=>({ ...p, page:1 })); await load();
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Franchisés</h1>
        <div className="ml-auto flex items-center gap-2">
          <input value={q.search} onChange={e=>setQ(p=>({ ...p, search:e.target.value, page:1 }))} placeholder="nom / SIREN / email" className="border rounded px-2 py-1 text-sm"/>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={q.onlyInactive} onChange={e=>setQ(p=>({ ...p, onlyInactive:e.target.checked, page:1 }))}/> Inactifs</label>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">Nouveau</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading?'Chargement…':`Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-black/5"><tr>
            <th className="text-left px-3 py-2">Nom</th>
            <th className="text-left px-3 py-2">SIREN</th>
            <th className="text-left px-3 py-2">Contact</th>
            <th className="text-left px-3 py-2">Entrepôt par défaut</th>
            <th className="text-left px-3 py-2">Actif</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
            {items.map(f=>(
              <tr key={f.id} className="border-t">
                <td className="px-3 py-2">{f.name}</td>
                <td className="px-3 py-2">{f.siren}</td>
                <td className="px-3 py-2">{f.contactEmail || f.contactPhone || '—'}</td>
                <td className="px-3 py-2">{f.defaultWarehouseId ? f.defaultWarehouseId.slice(0,8)+'…' : '—'}</td>
                <td className="px-3 py-2">{f.active ? 'Oui' : 'Non'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={()=>openEdit(f)} className="underline">Éditer</button>
                </td>
              </tr>
            ))}
            {!loading && items.length===0 && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Aucun franchisé</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={q.page<=1} onClick={()=>setQ(p=>({ ...p, page: Math.max(1, p.page-1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {q.page} / {pages}</span>
        <button disabled={q.page>=pages} onClick={()=>setQ(p=>({ ...p, page: Math.min(pages, p.page+1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-md w-full max-w-2xl">
            <form onSubmit={submit} className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">{editing?'Modifier le franchisé':'Nouveau franchisé'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Nom</label><input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
                <div><label className="block text-sm mb-1">SIREN</label><input value={form.siren} onChange={e=>setForm({...form, siren:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Email</label><input value={form.contactEmail} onChange={e=>setForm({...form, contactEmail:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
                <div><label className="block text-sm mb-1">Téléphone</label><input value={form.contactPhone} onChange={e=>setForm({...form, contactPhone:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
              </div>
              <div><label className="block text-sm mb-1">Adresse de facturation</label><input value={form.billingAddress} onChange={e=>setForm({...form, billingAddress:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm mb-1">Default WarehouseId</label><input value={form.defaultWarehouseId} onChange={e=>setForm({...form, defaultWarehouseId:e.target.value})} className="border rounded px-2 py-1 w-full"/></div>
                <label className="inline-flex items-center gap-2 text-sm self-end"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})}/> Actif</label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setIsOpen(false)} className="border rounded px-3 py-1">Annuler</button>
                <button type="submit" className="border rounded px-3 py-1">{editing?'Enregistrer':'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
