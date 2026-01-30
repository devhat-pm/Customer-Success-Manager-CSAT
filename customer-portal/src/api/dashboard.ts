import apiClient from './client';
import {
  CustomerDashboard,
  HealthScore,
  TicketsSummary,
  CustomerProducts,
  RecentActivity,
  PendingSurveys,
  ContractInfo,
  AnnouncementsList,
} from '@/types';

const DASHBOARD_BASE = '/portal/dashboard';

export const dashboardApi = {
  /**
   * Get full dashboard data
   */
  getDashboard: async (): Promise<CustomerDashboard> => {
    const response = await apiClient.get<CustomerDashboard>(`${DASHBOARD_BASE}/`);
    return response.data;
  },

  /**
   * Get health score widget data
   */
  getHealthScore: async (): Promise<HealthScore | null> => {
    const response = await apiClient.get<HealthScore | null>(`${DASHBOARD_BASE}/health-score`);
    return response.data;
  },

  /**
   * Get tickets summary widget data
   */
  getTicketsSummary: async (): Promise<TicketsSummary> => {
    const response = await apiClient.get<TicketsSummary>(`${DASHBOARD_BASE}/tickets`);
    return response.data;
  },

  /**
   * Get products widget data
   */
  getProducts: async (): Promise<CustomerProducts> => {
    const response = await apiClient.get<CustomerProducts>(`${DASHBOARD_BASE}/products`);
    return response.data;
  },

  /**
   * Get recent activity widget data
   */
  getRecentActivity: async (
    skip = 0,
    limit = 10
  ): Promise<RecentActivity> => {
    const response = await apiClient.get<RecentActivity>(`${DASHBOARD_BASE}/activity`, {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * Get pending surveys widget data
   */
  getPendingSurveys: async (): Promise<PendingSurveys> => {
    const response = await apiClient.get<PendingSurveys>(`${DASHBOARD_BASE}/pending-surveys`);
    return response.data;
  },

  /**
   * Get contract info widget data
   */
  getContractInfo: async (): Promise<ContractInfo> => {
    const response = await apiClient.get<ContractInfo>(`${DASHBOARD_BASE}/contract`);
    return response.data;
  },

  /**
   * Get announcements widget data
   */
  getAnnouncements: async (): Promise<AnnouncementsList> => {
    const response = await apiClient.get<AnnouncementsList>(`${DASHBOARD_BASE}/announcements`);
    return response.data;
  },
};
