import type { Warehouse } from '@drivn-cook/shared';

export type FranchiseeFormValue = {
  name: string;
  siren: string;
  contactEmail: string;
  contactPhone: string;
  billingAddress: string;
  defaultWarehouseId: string;
  active: boolean;
};

type Props = {
  value: FranchiseeFormValue;
  onChange: (v: FranchiseeFormValue) => void;
  warehouses: Warehouse[];
  warehousesLoading?: boolean;
};

export default function FranchiseeForm({ value, onChange, warehouses, warehousesLoading }: Props) {
  const set = (patch: Partial<FranchiseeFormValue>) => onChange({ ...value, ...patch });

  return (
    <fieldset className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Nom</label>
          <input value={value.name} onChange={(e) => set({ name: e.target.value })} className="border rounded px-2 py-1 w-full" required />
        </div>
        <div>
          <label className="block text-sm mb-1">SIREN</label>
          <input value={value.siren} onChange={(e) => set({ siren: e.target.value })} className="border rounded px-2 py-1 w-full" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" value={value.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Téléphone</label>
          <input value={value.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} className="border rounded px-2 py-1 w-full" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Adresse de facturation</label>
        <input value={value.billingAddress} onChange={(e) => set({ billingAddress: e.target.value })} className="border rounded px-2 py-1 w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Entrepôt par défaut</label>
          <div className="flex items-center gap-2">
            <select value={value.defaultWarehouseId} onChange={(e) => set({ defaultWarehouseId: e.target.value })} className="border rounded px-2 py-1 w-full">
              <option value="">— Aucun —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}{w.city ? ` — ${w.city}` : ''}{w.postalCode ? ` (${w.postalCode})` : ''}
                </option>
              ))}
            </select>
            {warehousesLoading && <span className="text-xs opacity-60">Chargement…</span>}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.active} onChange={(e) => set({ active: e.target.checked })} /> Actif
        </label>
      </div>
    </fieldset>
  );
}
