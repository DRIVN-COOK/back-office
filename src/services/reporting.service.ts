import { api, type SalesSummary, type RevenueShareReport, type Paged } from '@drivn-cook/shared';

export async function listSalesSummaries(params?: { franchiseeId?: string; period?: string; page?: number; pageSize?: number }) {
  const res = await api.get<Paged<SalesSummary>>('/sales-summaries', { params });
  return res.data;
}

export async function listRevenueReports(params?: { franchiseeId?: string; period?: string; page?: number; pageSize?: number }) {
  const res = await api.get<Paged<RevenueShareReport>>('/revenue-reports', { params });
  return res.data;
}

export async function getRevenueReport(id: string) {
  const res = await api.get<RevenueShareReport>(`/revenue-reports/${id}`);
  return res.data;
}
