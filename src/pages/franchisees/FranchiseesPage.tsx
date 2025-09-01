import { useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  Modal,
  DataTable,
  type Franchisee,
  type Warehouse,
  type FranchiseUser,
  type Paged,
  type User,
  type Column,
} from '@drivn-cook/shared';

import {
  listFranchisees,
  createFranchisee,
  updateFranchisee,
  deleteFranchisee,
  listWarehouses,
  listFranchiseUsers,
  attachFranchiseUser,
  updateFranchiseUser,
  detachFranchiseUser,
} from '../../services';

import FranchiseeForm, { type FranchiseeFormValue } from './utils/FranchiseeForm';
import FranchiseUsersManager from './utils/FranchiseUserManager';

type Query = { search: string; onlyInactive: boolean; page: number; pageSize: number };

const EMPTY_FORM: FranchiseeFormValue = {
  name: '',
  siren: '',
  contactEmail: '',
  contactPhone: '',
  billingAddress: '',
  defaultWarehouseId: '',
  active: true,
};

export default function FranchiseesPage() {
  // Query & listing
  const [q, setQ] = useState<Query>({ search: '', onlyInactive: false, page: 1, pageSize: 20 });
  const [items, setItems] = useState<Franchisee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / q.pageSize)), [total, q.pageSize]);

  // Modal
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Franchisee | null>(null);
  const [form, setForm] = useState<FranchiseeFormValue>({ ...EMPTY_FORM });

  // Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [whLoading, setWhLoading] = useState(false);

  // Franchise users
  const [fuLoading, setFuLoading] = useState(false);
  const [franchiseUsers, setFranchiseUsers] = useState<FranchiseUser[]>([]);
  const [attachUserForm, setAttachUserForm] = useState<{ userId: string; roleInFranchise: string }>({
    userId: '',
    roleInFranchise: 'STAFF',
  });

  // Debounces
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Loads */
  async function loadList() {
    setLoading(true);
    try {
      const data = await listFranchisees({ q: q.search || undefined, page: q.page, pageSize: q.pageSize });
      let list = data.items ?? [];
      if (q.onlyInactive) list = list.filter((x) => !x.active);
      setItems(list);
      setTotal(q.onlyInactive ? list.length : data.total ?? list.length);
    } finally {
      setLoading(false);
    }
  }

  async function loadWarehousesForSelect() {
    setWhLoading(true);
    try {
      const data = await listWarehouses({ page: 1, pageSize: 100 });
      setWarehouses(data.items ?? []);
    } finally {
      setWhLoading(false);
    }
  }

  async function loadFranchiseUsersFor(franchiseeId: string) {
    setFuLoading(true);
    try {
      const data = await listFranchiseUsers(franchiseeId);
      setFranchiseUsers(data.items ?? []);
    } finally {
      setFuLoading(false);
    }
  }

  /** User search adapter for FranchiseUsersManager (uses shared API) */
  async function searchUsersAdapter(q: string) {
    const res = await api.get<Paged<User>>('/users', { params: { q: q || undefined, page: 1, pageSize: 20 } });
    return (res.data.items ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      label: ((u.firstName ?? '') + ' ' + (u.lastName ?? '')).trim() || u.email,
    }));
  }

  /** Effects */
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.page, q.pageSize]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setQ((p) => ({ ...p, page: 1 }));
      loadList();
    }, 300);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.search, q.onlyInactive]);

  /** Actions */
  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setIsOpen(true);
    loadWarehousesForSelect();
    setFranchiseUsers([]);
  }

  async function openEdit(f: Franchisee) {
    setEditing(f);
    setForm({
      name: f.name,
      siren: f.siren,
      contactEmail: f.contactEmail || '',
      contactPhone: f.contactPhone || '',
      billingAddress: f.billingAddress || '',
      defaultWarehouseId: f.defaultWarehouseId || '',
      active: f.active,
    });
    setIsOpen(true);
    await Promise.all([loadWarehousesForSelect(), loadFranchiseUsersFor(f.id)]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, defaultWarehouseId: form.defaultWarehouseId || undefined };
    if (editing) await updateFranchisee(editing.id, payload);
    else await createFranchisee(payload);
    setIsOpen(false);
    setQ((p) => ({ ...p, page: 1 }));
    await loadList();
  }

  async function onDeleteFranchisee(id: string) {
    if (!confirm('Supprimer définitivement ce franchisé ? Cette action est irréversible.')) return;
    await deleteFranchisee(id);
    if (editing?.id === id) setIsOpen(false);
    if (q.page > 1 && items.length === 1) setQ((p) => ({ ...p, page: p.page - 1 }));
    await loadList();
  }

  async function onChangeFranchiseUserRole(franchiseUserId: string, role: string) {
    await updateFranchiseUser(franchiseUserId, { roleInFranchise: role || null });
    if (editing) await loadFranchiseUsersFor(editing.id);
  }

  async function onDetachFranchiseUser(franchiseUserId: string) {
    if (!confirm('Détacher cet utilisateur de la franchise ?')) return;
    await detachFranchiseUser(franchiseUserId);
    if (editing) await loadFranchiseUsersFor(editing.id);
  }

  async function onAttachFranchiseUser() {
    if (!editing) return;
    if (!attachUserForm.userId) return alert('Sélectionne un utilisateur');
    await attachFranchiseUser({
      userId: attachUserForm.userId,
      franchiseeId: editing.id,
      roleInFranchise: attachUserForm.roleInFranchise || null,
    });
    setAttachUserForm({ userId: '', roleInFranchise: 'STAFF' });
    await loadFranchiseUsersFor(editing.id);
  }

  /** Columns for DataTable */
  const columns: Column<Franchisee>[] = [
    { header: 'Nom', render: (f) => f.name, getSortValue: (f) => f.name, width: 'min-w-[200px]' },
    { header: 'SIREN', render: (f) => f.siren, getSortValue: (f) => f.siren, width: 'w-40' },
    {
      header: 'Contact',
      render: (f) =>
        f.contactEmail || f.contactPhone ? (
          <div className="flex flex-col">
            {f.contactEmail && <span>{f.contactEmail}</span>}
            {f.contactPhone && <span className="opacity-70">{f.contactPhone}</span>}
          </div>
        ) : (
          '—'
        ),
      getSortValue: (f) => f.contactEmail ?? '',
      width: 'min-w-[220px]',
    },
    {
      header: 'Entrepôt par défaut',
      render: (f) => (f.defaultWarehouseId ? f.defaultWarehouseId.slice(0, 8) + '…' : '—'),
      getSortValue: (f) => f.defaultWarehouseId ?? '',
      width: 'w-48',
    },
    {
      header: 'Actif',
      render: (f) => (f.active ? 'Oui' : 'Non'),
      getSortValue: (f) => (f.active ? 1 : 0),
      align: 'center',
      width: 'w-24',
    },
    {
      header: 'Actions',
      render: (f) => (
        <div className="text-right space-x-3">
          <button onClick={() => openEdit(f)} className="underline">Éditer</button>
          <button onClick={() => onDeleteFranchisee(f.id)} className="text-red-600 underline">Supprimer</button>
        </div>
      ),
      align: 'right',
      width: 'w-48',
    },
  ];

  /** Render */
  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Franchisés</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q.search}
            onChange={(e) => setQ((p) => ({ ...p, search: e.target.value }))}
            placeholder="nom / SIREN / email"
            className="border rounded px-2 py-1 text-sm"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={q.onlyInactive}
              onChange={(e) => setQ((p) => ({ ...p, onlyInactive: e.target.checked }))}
            />{' '}
            Inactifs
          </label>
          <button onClick={openCreate} className="border rounded px-2 py-1 text-sm">
            Nouveau
          </button>
        </div>
      </header>

      <DataTable
        items={items}
        columns={columns}
        loading={loading}
        page={q.page}
        pageSize={q.pageSize}
        total={total}
        onPageChange={(p) => setQ((prev) => ({ ...prev, page: p }))}
        minTableWidth="min-w-[1100px]"
      />

      {/* Modal */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-3xl">
        <form onSubmit={submit} className="p-4 space-y-4">
          <div className="flex items-start">
            <h2 className="text-lg font-semibold">
              {editing ? 'Modifier le franchisé' : 'Nouveau franchisé'}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={() => onDeleteFranchisee(editing.id)}
                className="ml-auto text-red-600 underline"
              >
                Supprimer ce franchisé
              </button>
            )}
          </div>

          <FranchiseeForm
            value={form}
            onChange={setForm}
            warehouses={warehouses}
            warehousesLoading={whLoading}
          />

          {editing && (
            <FranchiseUsersManager
              items={franchiseUsers}
              loading={fuLoading}
              onChangeRole={onChangeFranchiseUserRole}
              onDetach={onDetachFranchiseUser}
              attach={attachUserForm}
              onAttachChange={(patch) => setAttachUserForm((p) => ({ ...p, ...patch }))}
              onAttachSubmit={onAttachFranchiseUser}
              searchUsers={searchUsersAdapter}
            />
          )}

          <div className="flex justify-end gap-2">
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
