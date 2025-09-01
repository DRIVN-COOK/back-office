// back-office/src/pages/trucks/MaintenancePage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  Modal,
  type Column,
  MaintenanceType,
  MaintenanceStatus,
  maintenanceCreateSchema,
} from '@drivn-cook/shared';

// On part du principe que ces services existent déjà côté back-office.
import { listMaintenances, createMaintenance, updateMaintenance } from '../../services';

type Row = {
  id: string;
  truckId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledAt?: string | null;
  completedAt?: string | null;
  cost?: string | null; // decimal string
  notes?: string | null;
  truck?: { plateNumber: string };
  createdAt: string;
};

type FormShape = {
  truckId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledAt: string;  // ISO or ''
  completedAt: string;  // ISO or ''
  cost: string;         // decimal string or ''
  notes: string;
};

const TYPE_OPTIONS = Object.values(MaintenanceType) as MaintenanceType[];
const STATUS_OPTIONS = Object.values(MaintenanceStatus) as MaintenanceStatus[];

const EMPTY_FORM: FormShape = {
  truckId: '',
  type: TYPE_OPTIONS[0],
  status: MaintenanceStatus.PLANNED,
  scheduledAt: '',
  completedAt: '',
  cost: '',
  notes: '',
};

const toLocal = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function normalizeForm(f: FormShape) {
  return {
    truckId: f.truckId.trim(),
    type: f.type,
    status: f.status,
    scheduledAt: f.scheduledAt ? f.scheduledAt : undefined,
    completedAt: f.completedAt ? f.completedAt : undefined,
    cost: f.cost.trim() ? f.cost.trim() : undefined,
    notes: f.notes.trim() ? f.notes.trim() : undefined,
  };
}

export default function MaintenancePage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MaintenanceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormShape>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await listMaintenances({
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

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, pageSize]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    try {
      // On évite les conversions aller-retour sur datetime-local:
      // - On stocke directement la valeur du <input type="datetime-local"> en ISO dans form.*
      const payload = normalizeForm(form);
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
        alert('Erreur création maintenance');
        console.error(err);
      }
    }
  }

  async function advanceStatus(id: string, next: MaintenanceStatus) {
    const snapshot = [...items];
    setItems((list) =>
      list.map((x) =>
        x.id === id
          ? {
              ...x,
              status: next,
              completedAt: next === MaintenanceStatus.DONE ? new Date().toISOString() : x.completedAt,
            }
          : x,
      ),
    );
    try {
      await updateMaintenance(id, { status: next });
    } catch (e) {
      console.error(e);
      setItems(snapshot);
      alert('Maj statut impossible');
    }
  }

  // Colonnes DataTable
  const columns: Column<Row>[] = [
    {
      header: 'Camion',
      render: (m) => m.truck?.plateNumber ?? m.truckId,
      getSortValue: (m) => m.truck?.plateNumber ?? m.truckId,
      width: 'w-40',
    },
    {
      header: 'Type',
      render: (m) => m.type,
      getSortValue: (m) => TYPE_OPTIONS.indexOf(m.type),
      width: 'w-40',
    },
    {
      header: 'Statut',
      render: (m) => m.status,
      getSortValue: (m) => STATUS_OPTIONS.indexOf(m.status),
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
        <h1 className="text-xl font-semibold">Maintenance & Pannes</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as MaintenanceStatus | 'ALL');
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="ALL">Tous statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setErrors({});
              setForm({ ...EMPTY_FORM });
              setIsOpen(true);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            Nouvelle fiche
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

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

      {/* Pagination secondaire (facultative) */}
      <div className="flex items-center gap-2 justify-end">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Précédent
        </button>
        <span className="text-sm">
          Page {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Suivant
        </button>
      </div>

      {/* Modal nouvelle maintenance */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-lg">
        <form onSubmit={submit} className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Nouvelle maintenance / panne</h2>

          <div>
            <label className="block text-sm mb-1">TruckId</label>
            <input
              value={form.truckId}
              onChange={(e) => setForm({ ...form, truckId: e.target.value })}
              className="border rounded px-2 py-1 w-full"
            />
            {errors.truckId && <p className="text-xs text-red-600">{errors.truckId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as MaintenanceType })}
                className="border rounded px-2 py-1 w-full"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as MaintenanceStatus })}
                className="border rounded px-2 py-1 w-full"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Planifié</label>
              <input
                type="datetime-local"
                value={form.scheduledAt ? new Date(form.scheduledAt).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : '',
                  })
                }
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Terminé (optionnel)</label>
              <input
                type="datetime-local"
                value={form.completedAt ? new Date(form.completedAt).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    completedAt: e.target.value ? new Date(e.target.value).toISOString() : '',
                  })
                }
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </div>

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
            <button type="submit" className="border rounded px-3 py-1">
              Créer
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
