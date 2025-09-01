import { api, type FranchiseUser, type Paged } from '@drivn-cook/shared';


export async function listFranchiseUsers(franchiseeId: string) {
  const res = await api.get<Paged<FranchiseUser>>('/franchise-users', {
    params: { franchiseeId, page: 1, pageSize: 100 },
  });
  return res.data;
}

export async function attachFranchiseUser(payload: {
  userId: string;
  franchiseeId: string;
  roleInFranchise?: string | null;
}) {
  const res = await api.post<FranchiseUser>('/franchise-users', payload);
  return res.data;
}

export async function updateFranchiseUser(id: string, payload: Partial<FranchiseUser>) {
  const res = await api.patch<FranchiseUser>(`/franchise-users/${id}`, payload);
  return res.data;
}

export async function detachFranchiseUser(id: string) {
  await api.delete(`/franchise-users/${id}`);
}
