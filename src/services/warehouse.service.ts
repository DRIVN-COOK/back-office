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
  const res = await api.put<Warehouse>(`/warehouses/${id}`, payload);
  return res.data;
}

export async function deleteWarehouse(id: string) {
  await api.delete(`/warehouses/${id}`);
}

export async function listStockMovements(params: {
  warehouseId: string;
  productId?: string;
  type?: any; // ou StockMoveType si tu l’exportes depuis le shared
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get('/stock-movements', {
    params: {
      warehouseId: params.warehouseId,
      productId: params.productId || undefined,
      type: params.type || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
    },
  });
  return res.data as Paged<any>; // <- remplace any par StockMovement si tu as le type
}
