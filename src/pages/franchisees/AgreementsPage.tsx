import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  DataTable,
  type Column,
  type FranchiseAgreement,
} from '@drivn-cook/shared';

import {
  listFranchiseAgreements,
  createFranchiseAgreement,
  listFranchisees,
  downloadFranchiseAgreementPdf,
  deleteFranchiseAgreement,
} from '../../services';

type Query = { franchiseeId: string; page: number; pageSize: number };

// Valeurs fixes (non modifiables dans l'UI)
const FIXED_ENTRY_FEE = '50000.00';
const FIXED_REVENUE_PCT = '0.0400';

const EMPTY_FORM = {
  startDate: '',
  endDate: '',
  entryFeeAmount: FIXED_ENTRY_FEE,
  revenueSharePct: FIXED_REVENUE_PCT,
  notes: '',
};

export default function AgreementsPage() {
  const [q, setQ] = useState<Query>({ franchiseeId: '', page: 1, pageSize: 20 });

  const [items, setItems] = useState<FranchiseAgreement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [franchiseeSearch, setFranchiseeSearch] = useState('');
  const [franchiseeOptions, setFranchiseeOptions] = useState<Array<{ id:string; name:string }>>([]);
  const [franchiseeLoading, setFranchiseeLoading] = useState(false);
  const franchiseeSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function currentFranchiseeName(): string {
    const f = franchiseeOptions.find(o => o.id === q.franchiseeId);
    return f?.name ?? 'franchise';
    }

  async function load() {
    if (!q.franchiseeId) {
      setItems([]); setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const data = await listFranchiseAgreements({
        franchiseeId: q.franchiseeId,
        page: q.page,
        pageSize: q.pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q.franchiseeId, q.page, q.pageSize]);

  // Création avec validations (fin >= début)
  async function onCreateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!q.franchiseeId) return;

    const start = Date.parse(form.startDate);
    if (Number.isNaN(start)) return alert("Date de début invalide (format ISO attendu: YYYY-MM-DD)");

    let endOrUndefined: string | undefined = undefined;
    if (form.endDate) {
      const end = Date.parse(form.endDate);
      if (Number.isNaN(end)) return alert("Date de fin invalide (format ISO attendu: YYYY-MM-DD)");
      if (end < start) return alert("La date de fin ne peut pas être antérieure à la date de début.");
      endOrUndefined = form.endDate;
    }

    const payload = {
      franchiseeId: q.franchiseeId,
      startDate: form.startDate,
      endDate: endOrUndefined,
      // Valeurs figées côté UI (peuvent aussi être imposées côté API)
      entryFeeAmount: FIXED_ENTRY_FEE,
      revenueSharePct: FIXED_REVENUE_PCT,
      notes: form.notes || undefined,
    };

    try {
      await createFranchiseAgreement(payload);
      setIsOpen(false);
      setForm({ ...EMPTY_FORM });
      await load();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création du contrat.");
    }
  }

  useEffect(() => {
    if (franchiseeSearchDebounce.current) clearTimeout(franchiseeSearchDebounce.current);
    franchiseeSearchDebounce.current = setTimeout(() => {
      searchFranchisees(franchiseeSearch);
    }, 300);
    return () => { if (franchiseeSearchDebounce.current) clearTimeout(franchiseeSearchDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franchiseeSearch]);

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

  function filenameFor(a: FranchiseAgreement) {
    const start = new Date(a.startDate);
    const y = start.getFullYear();
    const m = String(start.getMonth()+1).padStart(2,'0');
    const d = String(start.getDate()).padStart(2,'0');
    const base = currentFranchiseeName().replace(/[^\p{L}\p{N}\-_.\s]/gu,'').trim().replace(/\s+/g,'_');
    return `Contrat_${base}_${y}-${m}-${d}.pdf`;
  }

  async function onDownloadPdf(a: FranchiseAgreement) {
    if (!q.franchiseeId) return;
    setDownloadingId(a.id);
    try {
      await downloadFranchiseAgreementPdf({
        franchiseeId: q.franchiseeId,
        agreementId: a.id,
        filename: filenameFor(a),
      });
    } catch (err) {
      console.error(err);
      alert("Impossible de télécharger le PDF du contrat.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function onDelete(a: FranchiseAgreement) {
    if (!q.franchiseeId) return;
    if (!confirm("Supprimer ce contrat ? Cette action est définitive.")) return;
    setDeletingId(a.id);
    try {
      await deleteFranchiseAgreement({ franchiseeId: q.franchiseeId, agreementId: a.id });
      await load();
    } catch (err) {
      console.error(err);
      alert("Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  // Table réduite : une seule colonne 'Contrat (PDF)' triable par date de début + actions
  const columns: Column<FranchiseAgreement>[] = [
  {
    header: 'Début',
    render: (a) => new Date(a.startDate).toLocaleDateString('fr-FR'),
    getSortValue: (a) => new Date(a.startDate).getTime(),
    width: 'w-32',
  },
  {
    header: 'Fin',
    render: (a) => (a.endDate ? new Date(a.endDate).toLocaleDateString('fr-FR') : '—'),
    getSortValue: (a) => (a.endDate ? new Date(a.endDate).getTime() : Number.MAX_SAFE_INTEGER),
    width: 'w-32',
  },
  {
    header: 'Contrat (PDF)',
    render: (a) => (
      <button
        onClick={() => onDownloadPdf(a)}
        disabled={downloadingId === a.id}
        className="underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
        title="Télécharger le contrat (PDF)"
      >
        Télécharger le PDF
      </button>
    ),
    getSortValue: (a) => new Date(a.startDate).getTime(),
    width: 'w-[200px]',
  },
  {
    header: 'Actions',
    render: (a) => (
      <button
        onClick={() => onDelete(a)}
        disabled={deletingId === a.id}
        className="border rounded px-2 py-1 text-sm hover:bg-red-50 disabled:opacity-50"
        title="Supprimer le contrat"
      >
        Supprimer
      </button>
    ),
    width: 'w-28',
    align: 'right',
  },
];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Accords (franchisé)</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* recherche par nom */}
          <input
            value={franchiseeSearch}
            onChange={(e) => setFranchiseeSearch(e.target.value)}
            placeholder="Rechercher un franchisé par nom"
            className="border rounded px-2 py-1 text-sm"
          />
          {/* select des franchisés */}
          <select
            value={q.franchiseeId}
            onChange={(e) => setQ((p) => ({ ...p, page: 1, franchiseeId: e.target.value }))}
            className="border rounded px-2 py-1 text-sm min-w-[260px]">
            <option value="">— Sélectionner un franchisé —</option>
            {franchiseeOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {franchiseeLoading && <span className="text-xs opacity-60">Chargement…</span>}

          <button
            disabled={!q.franchiseeId}
            onClick={() => setIsOpen(true)}
            className="border rounded px-2 py-1 text-sm"
          >
            Nouvel accord
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">
        {loading ? 'Chargement…' : `Total: ${total}`}
      </div>

      <DataTable
        items={items}
        columns={columns}
        loading={loading}
        page={q.page}
        pageSize={q.pageSize}
        total={total}
        onPageChange={(p) => setQ((prev) => ({ ...prev, page: p }))}
        // une seule colonne : on fixe une largeur minimale modérée
        minTableWidth="min-w-[640px]"
      />

      {/* Modal création : champs prix/redevance désactivés (valeurs fixes) */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-xl">
        <form onSubmit={onCreateAgreement} className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Nouvel accord</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Début (ISO)</label>
              <input
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                placeholder="2025-01-01"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Fin (ISO, optionnel)</label>
              <input
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                placeholder="2026-01-01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Droit d’entrée (€ HT)</label>
              <input
                value={form.entryFeeAmount}
                className="border rounded px-2 py-1 w-full bg-gray-50"
                disabled
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Redevance (ex: 0.0400)</label>
              <input
                value={form.revenueSharePct}
                className="border rounded px-2 py-1 w-full bg-gray-50"
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="text-xs -mt-2">
            Ces montants sont fixés par la politique commerciale et ne sont pas modifiables.
          </div>

          <div>
            <label className="block text-sm mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="border rounded px-2 py-1 w-full"
              rows={3}
              placeholder="Infos complémentaires…"
            />
          </div>

          <div className="flex justify-end gap-2">
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
