import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomerUser, Customer } from '@/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  customerUser: CustomerUser | null;
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    customerUser: CustomerUser;
    customer: Customer;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setCustomerUser: (user: CustomerUser) => void;
  updateCustomerUser: (user: Partial<CustomerUser>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      customerUser: null,
      customer: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (data) => {
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          customerUser: data.customerUser,
          customer: data.customer,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        set({
          accessToken,
          refreshToken,
        });
      },

      setCustomerUser: (user) => {
        set({
          customerUser: user,
        });
      },

      updateCustomerUser: (updates) => {
        const currentUser = get().customerUser;
        if (currentUser) {
          set({
            customerUser: { ...currentUser, ...updates },
          });
        }
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          customerUser: null,
          customer: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'customer-portal-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        customerUser: state.customerUser,
        customer: state.customer,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for convenience
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectCustomerUser = (state: AuthState) => state.customerUser;
export const selectCustomer = (state: AuthState) => state.customer;
export const selectAccessToken = (state: AuthState) => state.accessToken;
