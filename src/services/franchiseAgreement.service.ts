// src/services/franchiseAgreement.service.ts
import { api, type FranchiseAgreement, type Paged } from '@drivn-cook/shared';

export async function listFranchiseAgreements(params: {
  franchiseeId: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get<Paged<FranchiseAgreement>>('/franchise-agreements', { params });
  return res.data;
}

export async function createFranchiseAgreement(payload: {
  franchiseeId: string;
  startDate: string;
  endDate?: string;
  entryFeeAmount: string;
  revenueSharePct: string;
  notes?: string;
}) {
  const res = await api.post<FranchiseAgreement>('/franchise-agreements', payload);
  return res.data;
}
