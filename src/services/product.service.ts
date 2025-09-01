import { api, type Product, type ProductPrice, type Paged } from '@drivn-cook/shared';

export async function listProducts(params?: { q?: string; type?: string; active?: boolean; page?: number; pageSize?: number }) {
  const res = await api.get<Paged<Product>>('/products', { params });
  return res.data;
}

export async function getProduct(id: string) {
  const res = await api.get<Product>(`/products/${id}`);
  return res.data;
}

export async function createProduct(payload: Partial<Product>) {
  const res = await api.post<Product>('/products', payload);
  return res.data;
}

export async function updateProduct(id: string, payload: Partial<Product>) {
  const res = await api.put<Product>(`/products/${id}`, payload);
  return res.data;
}

export async function deleteProduct(id: string) {
  await api.delete(`/products/${id}`);
}

/** Prices */
export async function listProductPrices(productId: string) {
  const res = await api.get<Paged<ProductPrice>>('/product-prices', { params: { productId, page: 1, pageSize: 100 } });
  return res.data;
}

export async function addProductPrice(payload: Partial<ProductPrice>) {
  const res = await api.post<ProductPrice>('/product-prices', payload);
  return res.data;
}
