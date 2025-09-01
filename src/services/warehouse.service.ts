import { api, type Warehouse, type Paged } from '@drivn-cook/shared';

export async function listWarehouses(params?: { q?: string; page?: number; pageSize?: number; active?: boolean }) {
  const res = await api.get<Paged<Warehouse>>('/warehouses', { params });
  return res.data;
}

export async function getWarehouse(id: string) {
  const res = await api.get<Warehouse>(`/warehouses/${id}`);
  return res.data;
}

export async function createWarehouse(payload: Partial<Warehouse>) {
  const res = await api.post<Warehouse>('/warehouses', payload);
  return res.data;
}

export async function updateWarehouse(id: string, payload: Partial<Warehouse>) {
  const res = await api.patch<Warehouse>(`/warehouses/${id}`, payload);
  return res.data;
}

export async function deleteWarehouse(id: string) {
  await api.delete(`/warehouses/${id}`);
}
