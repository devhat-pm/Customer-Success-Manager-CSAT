import apiClient from './client';
import { CustomerProduct, CustomerProducts } from '@/types';

const DASHBOARD_BASE = '/portal/dashboard';

export interface ProductsResponse {
  products: CustomerProduct[];
  total_count: number;
}

export const productsApi = {
  // Get all products for authenticated customer (via dashboard endpoint)
  getProducts: async (): Promise<CustomerProducts> => {
    const response = await apiClient.get<CustomerProducts>(`${DASHBOARD_BASE}/products`);
    return response.data;
  },
};

export default productsApi;
