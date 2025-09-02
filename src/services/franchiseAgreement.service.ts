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

export async function downloadFranchiseAgreementPdf(params: {
  franchiseeId: string; // non utilisé ici mais conservé pour compat
  agreementId: string;
  filename?: string;
}) {
  const { agreementId, filename = 'Contrat.pdf' } = params;

  // IMPORTANT : on passe par Axios + blob + chemin /api
  const res = await api.get(`/franchise-agreements/${encodeURIComponent(agreementId)}/pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function deleteFranchiseAgreement(params: {
  franchiseeId: string; // idem
  agreementId: string;
}) {
  const { agreementId } = params;
  await api.delete(`/franchise-agreements/${encodeURIComponent(agreementId)}`);
  return true;
}
