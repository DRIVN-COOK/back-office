// src/services/truck.service.ts
import { api, type Truck, TruckStatus, type Paged, type TruckMaintenance } from '@drivn-cook/shared';

export async function listTrucks(params: {
  search?: string;
  status?: TruckStatus;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get('/trucks', {
    params: {
      // envoie les deux au cas où l’API écoute "q" (legacy) OU "search" (nouveau)
      q: params.search || undefined,
      search: params.search || undefined,
      status: params.status || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });
  return res.data; // { items, total, ... }
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
  const res = await api.put<Truck>(`/trucks/${id}`, payload);
  return res.data;
}

export async function deleteTruck(id: string) {
  await api.delete(`/trucks/${id}`);
}


export async function listMaintenancesByTruck(
  truckId: string,
  params: { page?: number; pageSize?: number; status?: string }
) {
  const res = await api.get<Paged<TruckMaintenance>>(`/trucks/${truckId}/maintenances`, { params });
  return res.data;
}