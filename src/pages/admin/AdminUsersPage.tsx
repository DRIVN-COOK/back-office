import { useEffect, useState } from 'react';
import { DataTable, type Column, Role, Modal } from '@drivn-cook/shared';
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser,
  type UserRow,
  type UserFull,
} from '../../services';

type Query = { search: string; role: '' | Role; page: number; pageSize: number };
const ROLE_OPTIONS: readonly Role[] = [Role.ADMIN, Role.HQ_STAFF, Role.CUSTOMER, Role.FRANCHISEE] as const;

export default function AdminUsersPage() {
  const [q, setQ] = useState<Query>({ search: '', role: '' as '' | Role, page: 1, pageSize: 20 });
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserFull | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<{ email: string; role: Role; firstName: string; lastName: string }>({
    email: '',
    role: Role.CUSTOMER,
    firstName: '',
    lastName: '',
  });

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{ email: string; password: string; role: Role; firstName: string; lastName: string }>({
    email: '',
    password: '',
    role: Role.CUSTOMER,
    firstName: '',
    lastName: '',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await listUsers({
        search: q.search || undefined,
        role: q.role || undefined,
        page: q.page,
        pageSize: q.pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q.page, q.pageSize]);

  async function openEdit(u: UserRow) {
    setEditOpen(true);
    setEditLoading(true);
    try {
      const full = await getUser(u.id);
      setEditing(full);
      setEditForm({
        email: full.email,
        role: full.role,
        firstName: full.firstName ?? '',
        lastName: full.lastName ?? '',
      });
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateUser(editing.id, {
        email: editForm.email,
        role: editForm.role,
        firstName: editForm.firstName || null,
        lastName: editForm.lastName || null,
      });
      setEditOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`Supprimer l'utilisateur ${u.email} ?`)) return;
    await deleteUser(u.id);
    await load();
  }

  function openCreate() {
    setCreateForm({ email: '', password: '', role: Role.CUSTOMER, firstName: '', lastName: '' });
    setCreateOpen(true);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await createUser({
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        firstName: createForm.firstName || null,
        lastName: createForm.lastName || null,
      });
      setCreateOpen(false);
      await load();
    } finally {
      setCreating(false);
    }
  }

  const columns: Column<UserRow>[] = [
    {
      header: 'Email',
      render: (u) => u.email,
      getSortValue: (u) => u.email?.toLowerCase(),
      thClassName: 'min-w-[240px]',
    },
    {
      header: 'Nom',
      render: (u) => `${u.lastName ?? ''}`.trim() || '—',
      getSortValue: (u) => (u.lastName ?? '').toLowerCase(),
      thClassName: 'w-40',
    },
    {
      header: 'Prénom',
      render: (u) => `${u.firstName ?? ''}`.trim() || '—',
      getSortValue: (u) => (u.firstName ?? '').toLowerCase(),
      thClassName: 'w-40',
    },
    {
      header: 'Rôle',
      render: (u) => u.role,
      getSortValue: (u) => u.role,
      thClassName: 'w-44',
    },
    {
      header: 'Créé le',
      render: (u) => new Date(u.createdAt).toLocaleString(),
      getSortValue: (u) => new Date(u.createdAt).getTime(),
      thClassName: 'w-56',
    },
    {
      header: 'Dernière connexion',
      render: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'),
      getSortValue: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : -1),
      thClassName: 'w-56',
    },
    {
      header: (
        <div className="flex items-center justify-end">
          <button onClick={openCreate} className="underline">+ Créer</button>
        </div>
      ),
      align: 'right',
      render: (u) => (
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => void openEdit(u)} className="underline">Éditer</button>
          <button onClick={() => void handleDelete(u)} className="underline text-red-600">Supprimer</button>
        </div>
      ),
      thClassName: 'w-48',
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Utilisateurs</h1>
        <div className="ml-auto grid grid-cols-2 md:grid-cols-4 gap-2">
          <input
            value={q.search}
            onChange={(e) => setQ((p) => ({ ...p, search: e.target.value, page: 1 }))}
            placeholder="email / nom / prénom"
            className="border rounded px-2 py-1 text-sm"
          />
          <select
            value={q.role}
            onChange={(e) => setQ((p) => ({ ...p, role: e.target.value as '' | Role, page: 1 }))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Tous rôles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button onClick={() => void load()} className="border rounded px-2 py-1 text-sm">
            Filtrer
          </button>
        </div>
      </header>

      <div className="text-sm opacity-70">{loading ? 'Chargement…' : `Total: ${total}`}</div>

      <DataTable<UserRow>
        items={items}
        columns={columns}
        rowKey={(u) => u.id}
        loading={loading}
        emptyText="Aucun utilisateur"
        page={q.page}
        pageSize={q.pageSize}
        total={total}
        onPageChange={(page) => setQ((p) => ({ ...p, page }))}
        containerClassName="overflow-x-auto border rounded"
        tableClassName="w-full text-sm"
        minTableWidth="min-w-[1100px]"
      />

      {/* MODAL EDIT */}
      <Modal
        open={editOpen}
        onClose={() => { if (!saving) { setEditOpen(false); setEditing(null); } }}
        className="p-4"
        maxWidth="max-w-xl"
      >
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-lg font-semibold">Modifier l’utilisateur</h2>
          <button
            className="text-sm underline"
            onClick={() => { if (!saving) { setEditOpen(false); setEditing(null); } }}
          >
            Fermer
          </button>
        </div>

        {editLoading ? (
          <div className="p-4 text-sm opacity-70">Chargement…</div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm">Email</label>
              <input
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                type="email"
              />
            </div>

            {/* Prénom / Nom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm">Prénom</label>
                <input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Nom</label>
                <input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
            </div>

            {/* Rôle */}
            <div className="space-y-1">
              <label className="text-sm">Rôle</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as Role }))}
                className="border rounded px-2 py-1 w-full"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Franchises (lecture seule) */}
            {editing?.franchiseUsers && editing.franchiseUsers.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm">Franchise(s)</label>
                <div className="text-sm border rounded px-2 py-2 bg-black/5">
                  {editing.franchiseUsers
                    .map((fu) => fu.franchisee?.name || fu.franchiseeId)
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                className="border rounded px-3 py-1"
                onClick={() => { if (!saving) { setEditOpen(false); setEditing(null); } }}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="border rounded px-3 py-1 bg-black text-white disabled:opacity-50"
                onClick={() => void handleSave()}
                disabled={saving || !editForm.email}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL CREATE */}
      <Modal
        open={createOpen}
        onClose={() => { if (!creating) { setCreateOpen(false); } }}
        className="p-4"
        maxWidth="max-w-xl"
      >
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-lg font-semibold">Créer un utilisateur</h2>
          <button
            className="text-sm underline"
            onClick={() => { if (!creating) { setCreateOpen(false); } }}
          >
            Fermer
          </button>
        </div>

        <div className="space-y-4 pt-4">
          {/* Email / Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm">Email</label>
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                type="email"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Mot de passe</label>
              <input
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
                type="password"
              />
            </div>
          </div>

          {/* Prénom / Nom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm">Prénom</label>
              <input
                value={createForm.firstName}
                onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Nom</label>
              <input
                value={createForm.lastName}
                onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
                className="border rounded px-2 py-1 w-full"
              />
            </div>
          </div>

          {/* Rôle */}
          <div className="space-y-1">
            <label className="text-sm">Rôle</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as Role }))}
              className="border rounded px-2 py-1 w-full"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              className="border rounded px-3 py-1"
              onClick={() => { if (!creating) { setCreateOpen(false); } }}
              disabled={creating}
            >
              Annuler
            </button>
            <button
              className="border rounded px-3 py-1 bg-black text-white disabled:opacity-50"
              onClick={() => void handleCreate()}
              disabled={creating || !createForm.email || !createForm.password}
            >
              {creating ? 'Création…' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
