import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import {
  Modal,
  DataTable,
  TruckStatus,                 // <- enum (valeur)
  truckCreateSchema,
  truckUpdateSchema,
  type Column,                // <- type-only (verbatimModuleSyntax)
  type Truck,                 // <- type-only
} from '@drivn-cook/shared';
import {
  listTrucks,
  createTruck,
  updateTruck,
  listFranchisees,
} from '../../services';

type Query = {
  search: string;
  status: TruckStatus | 'ALL';
  page: number;
  pageSize: number;
};

type FormShape = {
  franchiseeId: string;
  vin: string;
  plateNumber: string;
  model: string;
  purchaseDate: string; // ISO ou ''
  active: boolean;
  currentStatus: TruckStatus;
};

const EMPTY_FORM: FormShape = {
  franchiseeId: '',
  vin: '',
  plateNumber: '',
  model: '',
  purchaseDate: '',
  active: true,
  currentStatus: TruckStatus.AVAILABLE,
};

export default function TrucksPage() {
  // listing
  const STATUS_OPTIONS = Object.values(TruckStatus) as TruckStatus[];
  const [q, setQ] = useState<Query>({ search: '', status: 'ALL', page: 1, pageSize: 20 });
  const [items, setItems] = useState<Truck[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // modal + form
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [form, setForm] = useState<FormShape>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [franchiseeSearch, setFranchiseeSearch] = useState('');
  const [franchiseeOptions, setFranchiseeOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [franchiseeLoading, setFranchiseeLoading] = useState(false);
  const franchiseeSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredItems = useMemo(() => {
    if (!q.search.trim()) return items;
    const s = q.search.trim().toLowerCase();
    return items.filter((t) => {
      const fields = [
        t.vin,
        t.plateNumber,
        t.model ?? '',
      ].map((x) => (x ?? '').toLowerCase());
      return fields.some((f) => f.includes(s));
    });
  }, [items, q.search]);

  const [sortBy, setSortBy] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  /** Load list */
  async function load() {
    setLoading(true);
    try {
      // listTrucks accepte maintenant search/status (voir patch de service plus bas)
      const data = await listTrucks({
        search: q.search || undefined,
        status: q.status === 'ALL' ? undefined : q.status,
        page: q.page,
        pageSize: q.pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.search, q.status, q.page, q.pageSize]);

  useEffect(() => { searchFranchisees(''); }, []); // préchargement optionnel

  useEffect(() => {
    if (franchiseeSearchDebounce.current) clearTimeout(franchiseeSearchDebounce.current);
    franchiseeSearchDebounce.current = setTimeout(() => {
      searchFranchisees(franchiseeSearch);
    }, 300);
    return () => {
      if (franchiseeSearchDebounce.current) clearTimeout(franchiseeSearchDebounce.current);
    };
    // eslint-disable-next-line reacft-hooks/exhaustive-deps
  }, [franchiseeSearch]);

  /** Open/close */
  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setIsOpen(true);
  }

  function openEdit(t: Truck) {
    setEditing(t);
    setForm({
      franchiseeId: t.franchiseeId,
      vin: t.vin,
      plateNumber: t.plateNumber,
      model: t.model ?? '',
      purchaseDate: t.purchaseDate ?? '',
      active: t.active,
      currentStatus: t.currentStatus,
    });
    setErrors({});
    setIsOpen(true);
  }

  /** Submit */
  function normalizeForm(f: FormShape) {
    return {
      ...f,
      vin: f.vin.trim(),
      plateNumber: f.plateNumber.trim(),
      model: f.model.trim() || undefined,
      purchaseDate: f.purchaseDate ? f.purchaseDate : undefined, // '' -> undefined (souvent requis par Zod)
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); // reset visuel

    try {
      const normalized = normalizeForm(form);

      if (editing) {
        const payload = truckUpdateSchema.parse(normalized);
        await updateTruck(editing.id, payload);
      } else {
        const payload = truckCreateSchema.parse(normalized);
        await createTruck(payload);
        setQ((p) => ({ ...p, page: 1 }));
      }

      setIsOpen(false);
      await load();
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
        'Erreur de sauvegarde';
      alert(msg);
      console.error(err);
    }
  }

  /** Inline status update (optimistic) */
  async function setStatusOf(t: Truck, next: TruckStatus) {
    const snapshot = [...items];
    setItems((list) => list.map((x) => (x.id === t.id ? { ...x, currentStatus: next } : x)));
    try {
      await updateTruck(t.id, { currentStatus: next });
    } catch (e) {
      console.error(e);
      setItems(snapshot);
      alert('Maj statut impossible');
    }
  }

  function handleSortChange(colIndex: number, dir: 'asc' | 'desc') {
    setSortBy(colIndex);
    setSortDir(dir);
    // tri client
    const col = columns[colIndex];
    if (!col?.getSortValue) return;
    setItems(prev => {
      const copy = [...prev];
      copy.sort((a, b) => {
        const va = col.getSortValue!(a) ?? '';
        const vb = col.getSortValue!(b) ?? '';
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
      return copy;
    });
  }

  async function searchFranchisees(term: string) {
    setFranchiseeLoading(true);
    try {
      const data = await listFranchisees({ q: term || undefined, page: 1, pageSize: 50 });
      const opts = (data.items ?? [])
        .map(f => ({ id: f.id, name: f.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      setFranchiseeOptions(opts);
    } finally {
      setFranchiseeLoading(false);
    }
  }

  /** Table columns */
  const columns: Column<Truck>[] = [
    { header: 'Plaque', render: (t) => t.plateNumber, getSortValue: (t) => t.plateNumber, width: 'w-40' },
    { header: 'VIN', render: (t) => t.vin, getSortValue: (t) => t.vin, width: 'w-56' },
    {
      header: 'Modèle',
      render: (t) => t.model ?? '—',
      getSortValue: (t) => t.model ?? '',
      width: 'min-w-[160px]',
    },
    {
      header: 'Franchisé',
      render: (t) => (t.franchiseeId ? `${t.franchiseeId.slice(0, 8)}…` : '—'),
      getSortValue: (t) => t.franchiseeId,
      width: 'w-40',
    },
    {
      header: 'Statut',
      render: (t) => (
        <select
          value={t.currentStatus}
          onChange={(e) => setStatusOf(t, e.target.value as TruckStatus)}
          className="border rounded px-2 py-1"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
      getSortValue: (t) => STATUS_OPTIONS.indexOf(t.currentStatus as any),
      width: 'w-44',
    },
    {
      header: 'Actions',
      render: (t) => (
        <div className="text-right">
          <button onClick={() => openEdit(t)} className="underline">
            Éditer
          </button>
        </div>
      ),
      align: 'right',
      width: 'w-28',
    },
  ];

  /** Render */
  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Parc de camions</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q.search}
            onChange={(e) => setQ((p) => ({ ...p, page: 1, search: e.target.value }))}
            placeholder="VIN / plaque / modèle"
            className="border rounded px-2 py-1 text-sm"
          />
          <select
            value={q.status}
            onChange={(e) => setQ((p) => ({ ...p, page: 1, status: e.target.value as Query['status'] }))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="ALL">Tous statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">
            Nouveau
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <DataTable
        items={filteredItems}
        columns={columns}
        loading={loading}
        page={q.page}
        pageSize={q.pageSize}
        total={total}
        onPageChange={(p) => setQ((prev) => ({ ...prev, page: p }))}
        minTableWidth="min-w-[900px]"
        sortBy={sortBy}
        sortDir={sortBy === null ? null : sortDir}
        onSortChange={handleSortChange}
      />


      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-lg">
        <form onSubmit={submit} className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">{editing ? 'Modifier camion' : 'Nouveau camion'}</h2>

          <div>
            <label className="block text-sm mb-1">Franchisé</label>
            <input
              value={franchiseeSearch}
              onChange={(e) => setFranchiseeSearch(e.target.value)}
              placeholder="Rechercher par nom…"
              className="border rounded px-2 py-1 w-full"
            />
            <select
              value={form.franchiseeId}
              onChange={(e) => setForm({ ...form, franchiseeId: e.target.value })}
              className="mt-2 border rounded px-2 py-1 w-full"
              required
            >
              <option value="">— Sélectionner un franchisé —</option>
              {franchiseeOptions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {franchiseeLoading && <span className="text-xs opacity-60">Chargement…</span>}
            {errors.franchiseeId && <p className="text-xs text-red-600">{errors.franchiseeId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">VIN</label>
              <input
                value={form.vin}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
              {errors.vin && <p className="text-xs text-red-600">{errors.vin}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Plaque</label>
              <input
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
              {errors.plateNumber && <p className="text-xs text-red-600">{errors.plateNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Modèle</label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Achat (optionnel)</label>
              <input
                type="datetime-local"
                value={form.purchaseDate ? new Date(form.purchaseDate).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    purchaseDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                  })
                }
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />{' '}
              Actif
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              Statut
              <select
                value={form.currentStatus}
                onChange={(e) => setForm({ ...form, currentStatus: e.target.value as TruckStatus })}
                className="border rounded px-2 py-1"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsOpen(false)} className="border rounded px-3 py-1">
              Annuler
            </button>
            <button type="submit" className="border rounded px-3 py-1">
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
