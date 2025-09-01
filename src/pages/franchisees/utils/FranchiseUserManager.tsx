import { type FranchiseUser, UserSelect, type UserOption, } from '@drivn-cook/shared';

type Props = {
  items: FranchiseUser[];
  loading?: boolean;

  onChangeRole: (franchiseUserId: string, role: string) => void;
  onDetach: (franchiseUserId: string) => void;

  attach: { userId: string; roleInFranchise: string };
  onAttachChange: (patch: Partial<{ userId: string; roleInFranchise: string }>) => void;
  onAttachSubmit: () => void;

  searchUsers: (q: string) => Promise<UserOption[]>;
};

export default function FranchiseUsersManager({
  items,
  loading,
  onChangeRole,
  onDetach,
  attach,
  onAttachChange,
  onAttachSubmit,
  searchUsers,
}: Props) {
  return (
    <fieldset className="space-y-3 border-t pt-4">
      <div className="flex items-center">
        <h3 className="font-semibold">Utilisateurs rattachés</h3>
        {loading && <span className="ml-2 text-xs opacity-60">Chargement…</span>}
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[700px] w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="text-left px-3 py-2">Utilisateur</th>
              <th className="text-left px-3 py-2">Rôle</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((fu) => {
              const displayName = (fu.user?.firstName || fu.user?.lastName)
                ? `${fu.user?.firstName ?? ''} ${fu.user?.lastName ?? ''}`.trim()
                : fu.user?.email ?? fu.userId;
              return (
                <tr key={fu.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span>{displayName}</span>
                      {fu.user?.email && <span className="opacity-60">{fu.user.email}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={fu.roleInFranchise ?? ''}
                      onChange={(e) => onChangeRole(fu.id, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="">(aucun)</option>
                      <option value="OWNER">OWNER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="STAFF">STAFF</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => onDetach(fu.id)} className="text-red-600 underline">
                      Détacher
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-6 text-center opacity-60">Aucun utilisateur rattaché</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3 items-end">
        <div className="col-span-2">
          <label className="block text-sm mb-1">Rechercher un utilisateur</label>
          <UserSelect
            value={attach.userId}
            onChange={(id) => onAttachChange({ userId: id })}
            onSearch={searchUsers}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Rôle</label>
          <select
            value={attach.roleInFranchise}
            onChange={(e) => onAttachChange({ roleInFranchise: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="OWNER">OWNER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="STAFF">STAFF</option>
          </select>
        </div>
        <div className="col-span-3 flex justify-end">
          <button type="button" onClick={onAttachSubmit} className="border rounded px-3 py-1" disabled={!attach.userId}>
            Attacher l’utilisateur
          </button>
        </div>
      </div>
    </fieldset>
  );
}
