// back-office/src/services/users.ts
import { api, type Paged, Role } from '@drivn-cook/shared';

// Minimal côté back-office : on garde ce qui est utile à la page
export type UserRow = {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
};

export type FranchiseeLite = { id: string; name?: string | null };
export type FranchiseUserLite = {
  id: string;
  franchiseeId: string;
  franchisee?: FranchiseeLite | null;
};

export type UserFull = UserRow & {
  // pour le modal: on peut afficher les franchises liées (lecture seule)
  franchiseUsers?: FranchiseUserLite[] | null;
};

export type ListUsersQuery = {
  search?: string;
  role?: '' | Role;
  page?: number;
  pageSize?: number;
};

export async function listUsers(q: ListUsersQuery) {
  const res = await api.get<Paged<UserRow>>('/users', {
    params: {
      q: q.search || undefined,
      role: q.role || undefined, 
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 20,
    },
  });
  return res.data;
}

// Détail (avec relations légères) pour alimenter le modal d'édition
export async function getUser(id: string) {
  const res = await api.get<UserFull>(`/users/${id}`);
  return res.data;
}

// CREATE / UPDATE / DELETE
export type CreateUserPayload = {
  email: string;
  password: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
};
export async function createUser(payload: CreateUserPayload) {
  const res = await api.post<UserRow>('/users', payload);
  return res.data;
}

export type UpdateUserPayload = Partial<Pick<UserRow, 'email' | 'role' | 'firstName' | 'lastName'>> & Record<string, unknown>;
export async function updateUser(id: string, payload: UpdateUserPayload) {
  const res = await api.put<UserRow>(`/users/${id}`, payload);
  return res.data;
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`);
}
