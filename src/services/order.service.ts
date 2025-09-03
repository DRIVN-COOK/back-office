import {
  api,
  Channel,
  type PurchaseOrder,
  type PurchaseOrderLine,
  OrderStatus,
  type Paged,
  POStatus,
} from '@drivn-cook/shared';


type PurchaseOrderListItem = {
  id: string;
  status: POStatus;
  orderedAt: string | null;
  createdAt: string;
  franchiseeId: string | null;
  warehouseId: string | null;
  franchisee?: { id: string; name: string | null } | null;
  warehouse?: { id: string; name: string | null; code: string | null; city: string | null } | null;
  totalHT: string; // string "123.45" renvoyée par l'API
};


export async function listPurchaseOrders(params?: {
  franchiseeId?: string;   // OK
  warehouseId?: string;    // OK
  status?: POStatus;       // PAS de 'ALL' ici (géré côté page)
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get<Paged<PurchaseOrderListItem>>('/purchase-orders', { params });
  return res.data;
}

export async function getPurchaseOrder(id: string) {
  const res = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  return res.data;
}

export async function createPurchaseOrder(payload: Partial<PurchaseOrder>) {
  const res = await api.post<PurchaseOrder>('/purchase-orders', payload);
  return res.data;
}

export async function updatePurchaseOrder(id: string, payload: Partial<PurchaseOrder>) {
  const res = await api.put<PurchaseOrder>(`/purchase-orders/${id}`, payload);
  return res.data;
}

export async function updatePurchaseOrderStatus(id: string, status: POStatus) {
  try {
    // 1) tentative endpoint dédié (préférable si dispo côté API)
    const res = await api.put<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
    return res.data;
  } catch (err: any) {
    // si 404/405/501 → fallback PUT partiel
    const code = err?.response?.status;
    if (code === 404 || code === 405 || code === 501) {
      const res = await api.put<PurchaseOrder>(`/purchase-orders/${id}`, { status });
      return res.data;
    }
    // autres erreurs: on relaie
    throw err;
  }
}

export async function deletePurchaseOrder(id: string) {
  await api.delete(`/purchase-orders/${id}`);
}

/** Order lines (si exposées par l’API) */
export async function addPurchaseOrderLine(payload: Partial<PurchaseOrderLine>) {
  const res = await api.post<PurchaseOrderLine>('/purchase-order-lines', payload);
  return res.data;
}

export async function updatePurchaseOrderLine(id: string, payload: Partial<PurchaseOrderLine>) {
  const res = await api.put<PurchaseOrderLine>(`/purchase-order-lines/${id}`, payload);
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

export async function downloadCustomerOrderPdf(id: string) {
  const res = await api.get(`/customer-orders/${id}/pdf`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}