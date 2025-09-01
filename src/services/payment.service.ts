import { api, type Payment, type Paged } from '@drivn-cook/shared';

export async function listPayments(params?: { orderId?: string; status?: string; page?: number; pageSize?: number }) {
  const res = await api.get<Paged<Payment>>('/payments', { params });
  return res.data;
}

export async function getPayment(id: string) {
  const res = await api.get<Payment>(`/payments/${id}`);
  return res.data;
}

export async function createPayment(payload: Partial<Payment>) {
  const res = await api.post<Payment>('/payments', payload);
  return res.data;
}

export async function updatePayment(id: string, payload: Partial<Payment>) {
  const res = await api.patch<Payment>(`/payments/${id}`, payload);
  return res.data;
}
