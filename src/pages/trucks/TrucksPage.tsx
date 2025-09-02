import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  Modal,
  DataTable,
  TruckStatus,
  truckCreateSchema as baseTruckCreateSchema,
  truckUpdateSchema as baseTruckUpdateSchema,
  type Column,
  type Truck,
} from '@drivn-cook/shared';
import {
  listTrucks,
  createTruck,
  updateTruck,
  listFranchisees,
  listWarehouses,
} from '../../services';

// --- Schemas FRONT (on étend ceux du shared pour tolérer null côté UI) ---
const uuidNullable = z.string().uuid().nullable().optional();

const createSchema = baseTruckCreateSchema.extend({
  franchiseeId: uuidNullable,
  warehouseId: uuidNullable,
});

const updateSchema = baseTruckUpdateSchema.extend({
  franchiseeId: uuidNullable,
  warehouseId: uuidNullable,
});

type Query = {
  search: string;
  status: TruckStatus | 'ALL';
  page: number;
  pageSize: number;
};

type FormShape = {
  franchiseeId: string | null;
  warehouseId: string | null;
  vin: string;
  plateNumber: string;
  purchaseDate?: string; // ISO string ou ''
  active: boolean;
  currentStatus: TruckStatus;
};

const EMPTY_FORM: FormShape = {
  franchiseeId: null,
  warehouseId: null,
  vin: '',
  plateNumber: '',
  purchaseDate: '',
  active: true,
  currentStatus: TruckStatus.AVAILABLE,
};

export default function TrucksPage() {
  const STATUS_OPTIONS = Object.values(TruckStatus) as TruckStatus[];

  const [q, setQ] = useState<Query>({ search: '', status: 'ALL', page: 1, pageSize: 20 });
  const [items, setItems] = useState<Truck[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [form, setForm] = useState<FormShape>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Franchisés
  const [franchiseeSearch, setFranchiseeSearch] = useState('');
  const [franchiseeOptions, setFranchiseeOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [franchiseeLoading, setFranchiseeLoading] = useState(false);
  const franchiseeSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entrepôts
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const warehouseSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Maps id -> nom
  const franchiseeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of franchiseeOptions) m.set(f.id, f.name);
    return m;
  }, [franchiseeOptions]);
  const warehouseNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of warehouseOptions) m.set(w.id, w.name);
    return m;
  }, [warehouseOptions]);

  // Liste filtrée
  const filteredItems = useMemo(() => {
    if (!q.search.trim()) return items;
    const s = q.search.trim().toLowerCase();
    return items.filter((t) => {
      const fields = [t.vin, t.plateNumber].map((x) => (x ?? '').toLowerCase());
      return fields.some((f) => f.includes(s));
    });
  }, [items, q.search]);

  const [sortBy, setSortBy] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Charge liste
  async function load() {
    setLoading(true);
    try {
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
  }, [q.search, q.status, q.page, q.pageSize]);

  // Pré-charge options
  useEffect(() => {
    searchFranchisees('');
  }, []);
  useEffect(() => {
    searchWarehouses('');
  }, []);

  // Debounced searches
  useEffect(() => {
    if (franchiseeSearchDebounce.current) clearTimeout(franchiseeSearchDebounce.current);
    franchiseeSearchDebounce.current = setTimeout(() => {
      searchFranchisees(franchiseeSearch);
    }, 300);
    return () => {
      if (franchiseeSearchDebounce.current) clearTimeout(franchiseeSearchDebounce.current);
    };
  }, [franchiseeSearch]);

  useEffect(() => {
    if (warehouseSearchDebounce.current) clearTimeout(warehouseSearchDebounce.current);
    warehouseSearchDebounce.current = setTimeout(() => {
      searchWarehouses(warehouseSearch);
    }, 300);
    return () => {
      if (warehouseSearchDebounce.current) clearTimeout(warehouseSearchDebounce.current);
    };
  }, [warehouseSearch]);

  // Ouverture modales
  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setIsOpen(true);
  }

  function openEdit(t: Truck) {
    setEditing(t);
    setForm({
      franchiseeId: t.franchiseeId ?? null,
      warehouseId: (t as any).warehouseId ?? null,
      vin: t.vin,
      plateNumber: t.plateNumber,
      purchaseDate: t.purchaseDate ?? '',
      active: t.active,
      currentStatus: t.currentStatus,
    });
    setErrors({});
    setIsOpen(true);
  }

  // Helpers affichage noms
  function getFranchiseeName(id?: string) {
    if (!id) return '—';
    return franchiseeNameById.get(id) ?? `${id.slice(0, 8)}…`;
  }
  function getWarehouseName(id?: string) {
    if (!id) return '—';
    return warehouseNameById.get(id) ?? `${id.slice(0, 8)}…`;
  }

  // Règles statut
  function allowedStatuses(f: FormShape): TruckStatus[] {
    const hasFranchisee = !!f.franchiseeId;
    const hasWarehouse = !!f.warehouseId && !hasFranchisee;
    return STATUS_OPTIONS.filter((s) => {
      if (hasFranchisee && s === TruckStatus.AVAILABLE) return false;
      if (hasWarehouse && s === TruckStatus.DEPLOYED) return false;
      return true;
    });
  }

  // Normalisation
  function normalizeForm(f: FormShape, isCreate: boolean) {
    const franchiseeId = f.franchiseeId ?? null;
    const warehouseId = f.warehouseId ?? null;

    let currentStatus = f.currentStatus;
    if (isCreate) {
      currentStatus = franchiseeId ? TruckStatus.DEPLOYED : TruckStatus.AVAILABLE;
    } else {
      const allowed = allowedStatuses({ ...f, franchiseeId, warehouseId });
      if (!allowed.includes(currentStatus)) currentStatus = allowed[0] ?? f.currentStatus;
    }

    return {
      ...f,
      franchiseeId,
      warehouseId: franchiseeId ? null : warehouseId,
      vin: f.vin.trim(),
      plateNumber: f.plateNumber.trim(),
      purchaseDate: f.purchaseDate || '',
      currentStatus,
    };
  }

  // Validation métier UI
  function validateBusiness(data: FormShape) {
    const hasFr = !!data.franchiseeId;
    const hasWh = !!data.warehouseId;
    if (!hasFr && !hasWh) return 'Choisir un franchisé OU un entrepôt (au moins un).';
    if (hasFr && data.currentStatus === TruckStatus.AVAILABLE) {
      return 'Statut indisponible : un camion rattaché à un franchisé ne peut pas être "AVAILABLE".';
    }
    if (hasWh && data.currentStatus === TruckStatus.DEPLOYED) {
      return 'Statut indisponible : un camion rattaché à un entrepôt ne peut pas être "DEPLOYED".';
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    try {
      const normalized = normalizeForm(form, !editing);
      const businessErr = validateBusiness(normalized);
      if (businessErr) {
        alert(businessErr);
        return;
      }

      if (editing) {
        // null ou string sont acceptés par updateSchema (local)
        const payload = updateSchema.parse(normalized as any);
        await updateTruck(editing.id, payload as any);
      } else {
        // create : idem, on autorise null côté front (API gère)
        const payload = createSchema.parse(normalized as any);
        await createTruck(payload as any);
        setQ((p) => ({ ...p, page: 1 }));
      }

      setIsOpen(false);
      await load();
    } catch (err: unknown) {
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

  // Tri client
  function handleSortChange(colIndex: number, dir: 'asc' | 'desc') {
    setSortBy(colIndex);
    setSortDir(dir);
    const col = columns[colIndex];
    if (!col?.getSortValue) return;
    setItems((prev) => {
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

  // Fetch helpers
  async function searchFranchisees(term: string) {
    setFranchiseeLoading(true);
    try {
      const data = await listFranchisees({ q: term || undefined, page: 1, pageSize: 50 });
      const opts = (data.items ?? [])
        .map((f) => ({ id: f.id, name: f.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      setFranchiseeOptions(opts);
    } finally {
      setFranchiseeLoading(false);
    }
  }

  async function searchWarehouses(term: string) {
    setWarehouseLoading(true);
    try {
      const data = await listWarehouses({ q: term || undefined, page: 1, pageSize: 50 });
      const opts = (data.items ?? [])
        .map((w) => ({ id: w.id, name: w.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      setWarehouseOptions(opts);
    } finally {
      setWarehouseLoading(false);
    }
  }

  // Colonnes tableau
  const columns: Column<Truck>[] = [
    { header: 'Plaque', render: (t) => t.plateNumber, getSortValue: (t) => t.plateNumber, width: 'w-40' },
    { header: 'VIN', render: (t) => t.vin, getSortValue: (t) => t.vin, width: 'w-56' },
    {
      header: 'Franchisé',
      render: (t) => getFranchiseeName(t.franchiseeId),
      getSortValue: (t) => getFranchiseeName(t.franchiseeId).toLowerCase(),
      width: 'min-w-[200px]',
    },
    {
      header: 'Entrepôt',
      render: (t) => {
        const wid = (t as any).warehouseId as string | undefined;
        return t.franchiseeId ? '—' : getWarehouseName(wid);
      },
      getSortValue: (t) => {
        const wid = (t as any).warehouseId as string | undefined;
        return t.franchiseeId ? '' : getWarehouseName(wid).toLowerCase();
      },
      width: 'min-w-[200px]',
    },
    {
      header: 'Statut',
      render: (t) => t.currentStatus,
      getSortValue: (t) => t.currentStatus,
      width: 'w-40',
    },
   {
      header: 'Actions',
      render: (t) => (
        <div className="text-right space-x-3">
          <button onClick={() => openEdit(t)} className="underline">Éditer</button>
          <Link to={`/maintenance?truckId=${t.id}`} className="underline">
            Carnet d’entretien
          </Link>
        </div>
      ),
      align: 'right',
      width: 'w-44',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Parc de camions</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q.search}
            onChange={(e) => setQ((p) => ({ ...p, page: 1, search: e.target.value }))}
            placeholder="VIN / plaque"
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
        minTableWidth="min-w-[980px]"
        sortBy={sortBy}
        sortDir={sortBy === null ? null : sortDir}
        onSortChange={handleSortChange}
      />

      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-lg">
        <form onSubmit={submit} className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">{editing ? 'Modifier camion' : 'Nouveau camion'}</h2>

          {/* Franchisé (toujours désélectionnable) */}
          <div>
            <label className="block text-sm mb-1">Franchisé (optionnel)</label>
            <input
              value={franchiseeSearch}
              onChange={(e) => setFranchiseeSearch(e.target.value)}
              placeholder="Rechercher par nom…"
              className="border rounded px-2 py-1 w-full"
            />
            <select
              value={form.franchiseeId ?? ''}
              onChange={(e) => {
                const nextFrId = e.target.value ? e.target.value : null;
                setForm((p) => {
                  const next = { ...p, franchiseeId: nextFrId, warehouseId: nextFrId ? null : p.warehouseId };
                  return normalizeForm(next, !editing);
                });
              }}
              className="mt-2 border rounded px-2 py-1 w-full"
            >
              <option value="">— Aucun —</option>
              {franchiseeOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {franchiseeLoading && <span className="text-xs opacity-60">Chargement…</span>}
            {errors.franchiseeId && <p className="text-xs text-red-600">{errors.franchiseeId}</p>}
          </div>

          {/* Entrepôt : visible uniquement si pas de franchisé ; requis en création */}
          {!form.franchiseeId && (
            <div>
              <label className="block text-sm mb-1">{editing ? 'Entrepôt (optionnel)' : 'Entrepôt (obligatoire)'}</label>
              <input
                value={warehouseSearch}
                onChange={(e) => setWarehouseSearch(e.target.value)}
                placeholder="Rechercher un entrepôt…"
                className="border rounded px-2 py-1 w-full"
              />
              <select
                value={form.warehouseId ?? ''}
                onChange={(e) =>
                  setForm((p) =>
                    normalizeForm({ ...p, warehouseId: e.target.value ? e.target.value : null }, !editing)
                  )
                }
                className="mt-2 border rounded px-2 py-1 w-full"
                required={!editing}
              >
                <option value="">— Sélectionner —</option>
                {warehouseOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {warehouseLoading && <span className="text-xs opacity-60">Chargement…</span>}
              {errors.warehouseId && <p className="text-xs text-red-600">{errors.warehouseId}</p>}
            </div>
          )}

          {/* VIN / Plaque */}
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

          {/* Achat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Achat</label>
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

          {/* Statut : modifiable uniquement en édition */}
          {editing && (
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Actif
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                Statut
                <select
                  value={form.currentStatus}
                  onChange={(e) => {
                    const next = e.target.value as TruckStatus;
                    const allowed = allowedStatuses(form);
                    setForm((p) => ({ ...p, currentStatus: allowed.includes(next) ? next : p.currentStatus }));
                  }}
                  className="border rounded px-2 py-1"
                >
                  {allowedStatuses(form).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

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
