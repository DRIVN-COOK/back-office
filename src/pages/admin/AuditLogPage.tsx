import { useEffect, useMemo, useState } from 'react';
import { api } from '@drivn-cook/shared';

type Row = {
  id: string;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  payload?: any;
  createdAt: string;
};

type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export default function AuditLogPage() {
  const [q, setQ] = useState({ action: '', entity: '', actor: '', from: '', to: '', page: 1, pageSize: 50 });
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<Row>>('/audit-logs', {
        params: {
          action: q.action || undefined,
          entity: q.entity || undefined,
          actor: q.actor || undefined,   // id ou email
          from: q.from || undefined,     // ISO (YYYY-MM-DD)
          to: q.to || undefined,
          page: q.page,
          pageSize: q.pageSize,
        },
      });
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? res.data.items?.length ?? 0);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q.page, q.pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / q.pageSize)), [total, q.pageSize]);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <div className="ml-auto grid grid-cols-2 lg:grid-cols-6 gap-2">
          <input value={q.action} onChange={e=>setQ(p=>({ ...p, action: e.target.value, page:1 }))} placeholder="action" className="border rounded px-2 py-1 text-sm" />
          <input value={q.entity} onChange={e=>setQ(p=>({ ...p, entity: e.target.value, page:1 }))} placeholder="entity" className="border rounded px-2 py-1 text-sm" />
          <input value={q.actor} onChange={e=>setQ(p=>({ ...p, actor: e.target.value, page:1 }))} placeholder="actor (email/id)" className="border rounded px-2 py-1 text-sm" />
          <input value={q.from} onChange={e=>setQ(p=>({ ...p, from: e.target.value, page:1 }))} placeholder="from (YYYY-MM-DD)" className="border rounded px-2 py-1 text-sm" />
          <input value={q.to} onChange={e=>setQ(p=>({ ...p, to: e.target.value, page:1 }))} placeholder="to (YYYY-MM-DD)" className="border rounded px-2 py-1 text-sm" />
          <button onClick={()=>setQ(p=>({ ...p }))} className="border rounded px-2 py-1 text-sm">Filtrer</button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Acteur</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Cible</th>
              <th className="text-left px-3 py-2">Payload</th>
            </tr>
          </thead>
          <tbody>
            {items.map(ev => (
              <tr key={ev.id} className="border-t align-top">
                <td className="px-3 py-2">{new Date(ev.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{ev.actorEmail ?? ev.actorId ?? '—'}</td>
                <td className="px-3 py-2">{ev.action}</td>
                <td className="px-3 py-2">{ev.entity}{ev.entityId ? ` #${ev.entityId.slice(0,8)}…` : ''}</td>
                <td className="px-3 py-2">
                  <pre className="text-xs whitespace-pre-wrap max-w-[520px] overflow-hidden">{JSON.stringify(ev.payload)?.slice(0,800)}</pre>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center opacity-60">Aucune entrée</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button disabled={q.page<=1} onClick={()=>setQ(p=>({ ...p, page: Math.max(1, p.page-1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Précédent</button>
        <span className="text-sm">Page {q.page} / {pages}</span>
        <button disabled={q.page>=pages} onClick={()=>setQ(p=>({ ...p, page: Math.min(pages, p.page+1) }))} className="border rounded px-2 py-1 disabled:opacity-50">Suivant</button>
      </div>
    </section>
  );
}
