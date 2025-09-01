import { api, type Truck, type Paged } from '@drivn-cook/shared';

export async function listTrucks(params?: { franchiseeId?: string; page?: number; pageSize?: number; active?: boolean }) {
  const res = await api.get<Paged<Truck>>('/trucks', { params });
  return res.data;
}

export async function getTruck(id: string) {
  const res = await api.get<Truck>(`/trucks/${id}`);
  return res.data;
}

export async function createTruck(payload: Partial<Truck>) {
  const res = await api.post<Truck>('/trucks', payload);
  return res.data;
}

export async function updateTruck(id: string, payload: Partial<Truck>) {
  const res = await api.patch<Truck>(`/trucks/${id}`, payload);
  return res.data;
}

export async function deleteTruck(id: string) {
  await api.delete(`/trucks/${id}`);
}
