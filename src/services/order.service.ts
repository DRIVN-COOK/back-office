import {
  api,
  type CustomerOrder,
  type CustomerOrderLine,
  type Paged,
} from '@drivn-cook/shared';

export async function listOrders(params?: {
  franchiseeId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get<Paged<CustomerOrder>>('/orders', { params });
  return res.data;
}

export async function getOrder(id: string) {
  const res = await api.get<CustomerOrder>(`/orders/${id}`);
  return res.data;
}

export async function createOrder(payload: Partial<CustomerOrder>) {
  const res = await api.post<CustomerOrder>('/orders', payload);
  return res.data;
}

export async function updateOrder(id: string, payload: Partial<CustomerOrder>) {
  const res = await api.patch<CustomerOrder>(`/orders/${id}`, payload);
  return res.data;
}

export async function deleteOrder(id: string) {
  await api.delete(`/orders/${id}`);
}

/** Order lines (si exposées par l’API) */
export async function addOrderLine(payload: Partial<CustomerOrderLine>) {
  const res = await api.post<CustomerOrderLine>('/order-lines', payload);
  return res.data;
}

export async function updateOrderLine(id: string, payload: Partial<CustomerOrderLine>) {
  const res = await api.patch<CustomerOrderLine>(`/order-lines/${id}`, payload);
  return res.data;
}

export async function deleteOrderLine(id: string) {
  await api.delete(`/order-lines/${id}`);
}
