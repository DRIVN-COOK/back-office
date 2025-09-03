import { api, type Customer, type Paged } from '@drivn-cook/shared';

export async function listCustomers(params?: { q?: string; page?: number; pageSize?: number }) {
  const res = await api.get<Paged<Customer>>('/customers', { params });
  return res.data;
}

export async function getCustomer(id: string) {
  const res = await api.get<Customer>(`/customers/${id}`);
  return res.data;
}

export async function createCustomer(payload: Partial<Customer>) {
  const res = await api.post<Customer>('/customers', payload);
  return res.data;
}

export async function updateCustomer(id: string, payload: Partial<Customer>) {
  const res = await api.put<Customer>(`/customers/${id}`, payload);
  return res.data;
}

export async function deleteCustomer(id: string) {
  await api.delete(`/customers/${id}`);
}

export async function downloadCustomerOrderPdf(id: string) {
  const res = await api.get(`/customer-orders/${id}/pdf`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}