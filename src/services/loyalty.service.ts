import { api, type LoyaltyCard, type LoyaltyTransaction, type Paged } from '@drivn-cook/shared';

export async function getLoyaltyCardByCustomer(customerId: string) {
  const res = await api.get<LoyaltyCard>('/loyalty-cards/by-customer', { params: { customerId } });
  return res.data;
}

export async function listLoyaltyTxns(params: { loyaltyCardId: string; page?: number; pageSize?: number }) {
  const res = await api.get<Paged<LoyaltyTransaction>>('/loyalty-transactions', { params });
  return res.data;
}

export async function createLoyaltyTxn(payload: Partial<LoyaltyTransaction>) {
  const res = await api.post<LoyaltyTransaction>('/loyalty-transactions', payload);
  return res.data;
}
