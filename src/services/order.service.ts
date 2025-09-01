import {
  api,
  Channel,
  type CustomerOrder,
  type CustomerOrderLine,
  OrderStatus,
  type Paged,
  POStatus,
} from '@drivn-cook/shared';

export async function listPurchaseOrders(params?: {
  franchiseeId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get<Paged<CustomerOrder>>('/purchase-orders', { params });
  return res.data;
}

export async function getPurchaseOrder(id: string) {
  const res = await api.get<CustomerOrder>(`/purchase-orders/${id}`);
  return res.data;
}

export async function createPurchaseOrder(payload: Partial<CustomerOrder>) {
  const res = await api.post<CustomerOrder>('/purchase-orders', payload);
  return res.data;
}

export async function updatePurchaseOrder(id: string, payload: Partial<CustomerOrder>) {
  const res = await api.put<CustomerOrder>(`/purchase-orders/${id}`, payload);
  return res.data;
}

export async function updatePurchaseOrderStatus(id: string, status: POStatus) {
  const res = await api.put(`/purchase-orders/${id}/status`, { status });
  return res.data as any;
}

export async function deletePurchaseOrder(id: string) {
  await api.delete(`/purchase-orders/${id}`);
}

/** Order lines (si exposées par l’API) */
export async function addPurchaseOrderLine(payload: Partial<CustomerOrderLine>) {
  const res = await api.post<CustomerOrderLine>('/purchase-order-lines', payload);
  return res.data;
}

export async function updatePurchaseOrderLine(id: string, payload: Partial<CustomerOrderLine>) {
  const res = await api.put<CustomerOrderLine>(`/purchase-order-lines/${id}`, payload);
  return res.data;
}

export async function deletePurchaseOrderLine(id: string) {
  await api.delete(`/purchase-order-lines/${id}`);
}

/* ---------------------------------------
 * Invoices
 * ------------------------------------- */
// POST /invoices
export async function createInvoice(payload: { customerOrderId: string }) {
  const res = await api.post('/invoices', payload);
  return res.data as any;
}

export async function listCustomerOrders(params: {
  q?: string;
  status?: OrderStatus;
  channel?: Channel;
  from?: string;
  to?: string;
  truckId?: string;
  franchiseeId?: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get('/customer-orders', {
    params: {
      q: params.q || undefined,
      status: params.status || undefined,
      channel: params.channel || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      truckId: params.truckId || undefined,
      franchiseeId: params.franchiseeId || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });
  return res.data as Paged<any>; // <- remplace any par CustomerOrder si tu as le type
}
