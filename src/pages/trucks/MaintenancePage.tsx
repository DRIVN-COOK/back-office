import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  DataTable,
  Modal,
  type Column,
  MaintenanceType,
  MaintenanceStatus,
  maintenanceCreateSchema,
  type Truck,
} from '@drivn-cook/shared';
import { listMaintenances, createMaintenance, updateMaintenance, listTrucks } from '../../services';

type TruckOption = { id: string; label: string };

type Row = {
  id: string;
  truckId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledAt?: string | null;
  completedAt?: string | null;
  cost?: string | null;
  notes?: string | null;
  truck?: { plateNumber: string };
  createdAt: string;
};

type FormShape = {
  truckId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledAt: string;  // ISO ou ''
  completedAt: string;  // ISO ou ''
  cost: string;         // chaîne décimale ou ''
  notes: string;
};

const TYPE_OPTIONS = Object.values(MaintenanceType) as MaintenanceType[];
const STATUS_OPTIONS = Object.values(MaintenanceStatus) as MaintenanceStatus[];

// Libellés FR
const TYPE_LABELS: Record<MaintenanceType, string> = {
  SERVICE: 'Entretien',
  REPAIR: 'Réparation',
  INSPECTION: 'Inspection',
};
const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminé',
};

const EMPTY_FORM: FormShape = {
  truckId: '',
  type: TYPE_OPTIONS[0],
  status: MaintenanceStatus.PLANNED,
  scheduledAt: '',
  completedAt: '',
  cost: '',
  notes: '',
};

const toLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR') : '—');

// ★ Helpers date/heure local ↔ ISO (évite le décalage UTC)
function toInputLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}
function fromInputLocalToISO(v: string) {
  // v au format 'YYYY-MM-DDTHH:mm' interprété en local
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}
function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

// N’envoie scheduledAt/completedAt que si cohérent avec le statut
function normalizeForm(f: FormShape) {
  return {
    truckId: f.truckId.trim(),
    type: f.type,
    status: f.status,
    scheduledAt: f.status === MaintenanceStatus.PLANNED && f.scheduledAt ? f.scheduledAt : undefined,
    completedAt: f.status === MaintenanceStatus.DONE && f.completedAt ? f.completedAt : undefined,
    cost: f.cost.trim() ? f.cost.trim() : undefined,
    notes: f.notes.trim() ? f.notes.trim() : undefined,
  };
}

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const paramTruckId = sp.get('truckId') || (useParams() as any)?.truckId || '';
  const fixedTruckId = paramTruckId || '';

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MaintenanceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormShape>({ ...EMPTY_FORM, truckId: fixedTruckId });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ★ min pour datetime-local (mis à jour au rendu)
  const nowLocalMin = toInputLocalValue(new Date());

  // Select camion (recherche)
  const [truckSearch, setTruckSearch] = useState('');
  const [truckOptions, setTruckOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [truckLoading, setTruckLoading] = useState(false);

  // ---- Data ----
  async function load() {
    setLoading(true);
    try {
      const data = await listMaintenances({
        truckId: fixedTruckId || undefined,
        status: status === 'ALL' ? undefined : status,
        page,
        pageSize,
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

  async function searchTrucks(term: string) {
    setTruckLoading(true);
    try {
      const data = await listTrucks({ search: term || undefined, page: 1, pageSize: 50 });
      const items = (data.items ?? []) as Truck[];
      const opts: TruckOption[] = items
        .map((t) => ({
          id: t.id,
          label: t.plateNumber ? `${t.plateNumber} — ${t.vin}` : t.vin,
        }))
        .sort((a: TruckOption, b: TruckOption) =>
          a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
        );
      setTruckOptions(opts);
    } finally {
      setTruckLoading(false);
    }
  }

  // ---- Effects ----
  useEffect(() => { searchTrucks(''); }, []);
  useEffect(() => {
    const id = setTimeout(() => { searchTrucks(truckSearch); }, 300);
    return () => clearTimeout(id);
  }, [truckSearch]);

  useEffect(() => {
    setForm((f) => ({ ...f, truckId: fixedTruckId })); // pré-remplit pour la création
  }, [fixedTruckId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedTruckId, status, page, pageSize]);

  // ---- Submit ----
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // ★ Validation "pas de planification dans le passé"
    if (form.status === MaintenanceStatus.PLANNED && form.scheduledAt && isPast(form.scheduledAt)) {
      setErrors((prev) => ({ ...prev, scheduledAt: "Impossible de planifier dans le passé." }));
      return;
    }

    try {
      const payload = normalizeForm(form);
      if (fixedTruckId) payload.truckId = fixedTruckId; // sécurité
      maintenanceCreateSchema.parse(payload);
      await createMaintenance(payload);
      setIsOpen(false);
      await load();
    } catch (err: any) {
      if (err?.issues) {
        const map: Record<string, string> = {};
        err.issues.forEach((i: any) => {
          const key = (i.path?.[0] ?? '') as string;
          if (key) map[key] = i.message;
        });
        setErrors(map);
      } else {
        alert("Erreur lors de la création de la maintenance.");
        console.error(err);
      }
    }
  }

  // ---- Changement de statut (actions sur ligne) ----
  async function advanceStatus(id: string, next: MaintenanceStatus) {
    const snapshot = [...items];
    const nowIso = new Date().toISOString();

    // Optimistic UI
    setItems((list) =>
      list.map((x) =>
        x.id === id
          ? {
              ...x,
              status: next,
              completedAt: next === MaintenanceStatus.DONE ? nowIso : x.completedAt,
            }
          : x
      )
    );

    try {
      await updateMaintenance(
        id,
        next === MaintenanceStatus.DONE
          ? { status: next, completedAt: nowIso }
          : { status: next }
      );
    } catch (e) {
      console.error(e);
      setItems(snapshot);
      alert("Impossible de mettre à jour le statut.");
    }
  }

  // ---- Colonnes ----
  const columns: Column<Row>[] = [
    ...(fixedTruckId
      ? []
      : [{
          header: 'Camion',
          render: (m: Row) => m.truck?.plateNumber ?? m.truckId,
          getSortValue: (m: Row) => m.truck?.plateNumber ?? m.truckId,
          width: 'w-40',
        } as Column<Row>]
    ),
    {
      header: 'Type',
      render: (m) => TYPE_LABELS[m.type],
      getSortValue: (m) => TYPE_LABELS[m.type],
      width: 'w-40',
    },
    {
      header: 'Statut',
      render: (m) => STATUS_LABELS[m.status],
      getSortValue: (m) => STATUS_LABELS[m.status],
      width: 'w-40',
    },
    {
      header: 'Planifié',
      render: (m) => toLocal(m.scheduledAt),
      getSortValue: (m) => m.scheduledAt ?? '',
      width: 'w-44',
    },
    {
      header: 'Terminé',
      render: (m) => toLocal(m.completedAt),
      getSortValue: (m) => m.completedAt ?? '',
      width: 'w-44',
    },
    {
      header: 'Coût',
      render: (m) =>
        m.cost != null
          ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(m.cost))
          : '—',
      getSortValue: (m) => Number(m.cost ?? 0),
      align: 'right',
      width: 'w-28',
    },
    {
      header: 'Notes',
      render: (m) => (
        <span className="block max-w-[280px] truncate" title={m.notes ?? ''}>
          {m.notes ?? '—'}
        </span>
      ),
      getSortValue: (m) => m.notes ?? '',
      width: 'min-w-[300px]',
    },
    {
      header: 'Actions',
      render: (m) => (
        <div className="text-right space-x-2">
          {m.status === MaintenanceStatus.PLANNED && (
            <button onClick={() => advanceStatus(m.id, MaintenanceStatus.IN_PROGRESS)} className="underline">
              Démarrer
            </button>
          )}
          {m.status === MaintenanceStatus.IN_PROGRESS && (
            <button onClick={() => advanceStatus(m.id, MaintenanceStatus.DONE)} className="underline">
              Terminer
            </button>
          )}
        </div>
      ),
      align: 'right',
      width: 'w-40',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="border rounded px-2 py-1 text-sm">← Retour</button>
          <h1 className="text-xl font-semibold">
            Carnet d’entretien {fixedTruckId ? `— Camion #${fixedTruckId.slice(0,8)}…` : ''}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value as MaintenanceStatus | 'ALL'); }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="ALL">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={() => { setErrors({}); setForm({ ...EMPTY_FORM, truckId: fixedTruckId }); setIsOpen(true); }}
            className="border rounded px-2 py-1 text-sm"
          >
            Nouvelle fiche
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total : ${total}`}</div>

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

      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-lg">
        <form onSubmit={submit} className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Nouvelle maintenance / panne</h2>

          {/* Sélection camion */}
          {fixedTruckId ? (
            <div>
              <label className="block text-sm mb-1">Camion</label>
              <div className="text-sm px-2 py-1 border rounded bg-gray-50">
                {items?.[0]?.truck?.plateNumber
                  ? `${items[0].truck.plateNumber} — ${fixedTruckId.slice(0,8)}…`
                  : `#${fixedTruckId.slice(0,8)}…`}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1">Camion</label>
              <input
                value={truckSearch}
                onChange={(e) => setTruckSearch(e.target.value)}
                placeholder="Rechercher (plaque / VIN)…"
                className="border rounded px-2 py-1 w-full mb-2"
              />
              <select
                value={form.truckId}
                onChange={(e) => setForm({ ...form, truckId: e.target.value })}
                className="border rounded px-2 py-1 w-full"
                required
              >
                <option value="">— Sélectionner —</option>
                {truckOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              {truckLoading && <span className="text-xs opacity-60">Chargement…</span>}
              {errors.truckId && <p className="text-xs text-red-600">{errors.truckId}</p>}
            </div>
          )}

          {/* Type & Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}
                className="border rounded px-2 py-1 w-full"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) => {
                  const next = e.target.value as MaintenanceStatus;
                  setForm(prev => ({
                    ...prev,
                    status: next,
                    scheduledAt: next === MaintenanceStatus.PLANNED ? prev.scheduledAt : '',
                    completedAt: next === MaintenanceStatus.DONE ? prev.completedAt : '',
                  }));
                  // ★ Reset l’erreur si on quitte PLANNED
                  if (next !== MaintenanceStatus.PLANNED) {
                    setErrors((er) => {
                      const { scheduledAt, ...rest } = er;
                      return rest;
                    });
                  }
                }}
                className="border rounded px-2 py-1 w-full"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates conditionnelles */}
          <div className="grid grid-cols-2 gap-3">
            {form.status === MaintenanceStatus.PLANNED && (
              <div>
                <label className="block text-sm mb-1">Planifié pour</label>
                <input
                  type="datetime-local"
                  // ★ valeur en local
                  value={form.scheduledAt ? toInputLocalValue(new Date(form.scheduledAt)) : ''}
                  // ★ min = maintenant (empêche la sélection d’une date passée)
                  min={nowLocalMin}
                  onChange={(e) => {
                    const iso = e.target.value ? fromInputLocalToISO(e.target.value) : '';
                    // ★ garde la valeur vide OU future, sinon bloque + message
                    if (iso && isPast(iso)) {
                      setErrors((prev) => ({ ...prev, scheduledAt: "Impossible de planifier dans le passé." }));
                      // on ne modifie pas la valeur si invalide (ou on pourrait la “clamper” à maintenant)
                      return;
                    }
                    setErrors((prev) => {
                      const { scheduledAt, ...rest } = prev;
                      return rest;
                    });
                    setForm({ ...form, scheduledAt: iso });
                  }}
                  className="border rounded px-2 py-1 w-full"
                />
                {errors.scheduledAt && <p className="text-xs text-red-600">{errors.scheduledAt}</p>}
              </div>
            )}

            {form.status === MaintenanceStatus.DONE && (
              <div>
                <label className="block text-sm mb-1">Terminé le</label>
                <input
                  type="datetime-local"
                  value={form.completedAt ? toInputLocalValue(new Date(form.completedAt)) : ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      completedAt: e.target.value ? fromInputLocalToISO(e.target.value) : '',
                    })
                  }
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
            )}
          </div>

          {/* Coût & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Coût (HT)</label>
              <input
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="border rounded px-2 py-1 w-full"
                placeholder="125.00"
              />
              {errors.cost && <p className="text-xs text-red-600">{errors.cost}</p>}
            </div>
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsOpen(false)} className="border rounded px-3 py-1">
              Annuler
            </button>
            <button
              type="submit"
              className="border rounded px-3 py-1"
              // ★ désactive le submit si erreur planification
              disabled={!!errors.scheduledAt}
            >
              Créer
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
