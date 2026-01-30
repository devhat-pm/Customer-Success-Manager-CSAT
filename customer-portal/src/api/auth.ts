import apiClient from './client';
import {
  LoginCredentials,
  SignupData,
  TokenResponse,
  InvitationValidation,
  MessageResponse,
  CustomerUser,
} from '@/types';

const AUTH_BASE = '/portal/auth';

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(`${AUTH_BASE}/login`, {
      email: credentials.email,
      password: credentials.password,
      remember_me: credentials.rememberMe || false,
    });
    return response.data;
  },

  /**
   * Validate an invitation token
   */
  validateInvitation: async (token: string): Promise<InvitationValidation> => {
    const response = await apiClient.get<InvitationValidation>(
      `${AUTH_BASE}/validate-invitation/${token}`
    );
    return response.data;
  },

  /**
   * Register a new account using invitation token
   */
  signup: async (data: SignupData): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(`${AUTH_BASE}/signup`, data);
    return response.data;
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`${AUTH_BASE}/forgot-password`, {
      email,
    });
    return response.data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`${AUTH_BASE}/reset-password`, {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(`${AUTH_BASE}/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<CustomerUser> => {
    const response = await apiClient.get<CustomerUser>(`${AUTH_BASE}/me`);
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: {
    first_name?: string;
    last_name?: string;
    job_title?: string;
    phone?: string;
  }): Promise<CustomerUser> => {
    const response = await apiClient.put<CustomerUser>(`${AUTH_BASE}/me`, data);
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: {
    current_password: string;
    new_password: string;
  }): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`${AUTH_BASE}/me/change-password`, data);
    return response.data;
  },

  /**
   * Logout (invalidate refresh token on server)
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post(`${AUTH_BASE}/logout`);
    } catch (error) {
      // Ignore errors on logout
      console.error('Logout error:', error);
    }
  },
};
