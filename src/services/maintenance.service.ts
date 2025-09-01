import { api, type TruckMaintenance, type Paged } from '@drivn-cook/shared';

export async function listMaintenances(params: { truckId?: string; page?: number; pageSize?: number; status?: string }) {
  const res = await api.get<Paged<TruckMaintenance>>('/maintenances', { params });
  return res.data;
}

export async function getMaintenance(id: string) {
  const res = await api.get<TruckMaintenance>(`/maintenances/${id}`);
  return res.data;
}

export async function createMaintenance(payload: Partial<TruckMaintenance>) {
  const res = await api.post<TruckMaintenance>('/maintenances', payload);
  return res.data;
}

export async function updateMaintenance(id: string, payload: Partial<TruckMaintenance>) {
  const res = await api.patch<TruckMaintenance>(`/maintenances/${id}`, payload);
  return res.data;
}

export async function deleteMaintenance(id: string) {
  await api.delete(`/maintenances/${id}`);
}
