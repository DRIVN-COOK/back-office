import { api, type Franchisee, type Paged } from '@drivn-cook/shared';

export async function listFranchisees(params: {
  q?: string;
  page?: number;
  pageSize?: number;
  inactive?: boolean;
}) {
  const res = await api.get<Paged<Franchisee>>('/franchisees', { params });
  return res.data;
}

export async function getFranchisee(id: string) {
  const res = await api.get<Franchisee>(`/franchisees/${id}`);
  return res.data;
}

export async function createFranchisee(payload: Partial<Franchisee>) {
  const res = await api.post<Franchisee>('/franchisees', payload);
  return res.data;
}

export async function updateFranchisee(id: string, payload: Partial<Franchisee>) {
  const res = await api.put<Franchisee>(`/franchisees/${id}`, payload);
  return res.data;
}

export async function deleteFranchisee(id: string) {
  await api.delete(`/franchisees/${id}`);
}
