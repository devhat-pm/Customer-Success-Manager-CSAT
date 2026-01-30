import apiClient from './client';
import {
  Ticket,
  TicketDetail,
  TicketListResponse,
  CreateTicketData,
  CreateCommentData,
  TicketComment,
  TicketFilters,
  TicketStats,
} from '@/types';

const TICKETS_BASE = '/portal/tickets';

export const ticketsApi = {
  /**
   * Get list of tickets with optional filters
   */
  getTickets: async (filters?: TicketFilters): Promise<TicketListResponse> => {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.product) params.append('product', filters.product);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
    }

    const response = await apiClient.get<TicketListResponse>(`${TICKETS_BASE}/`, {
      params,
    });
    return response.data;
  },

  /**
   * Get ticket detail by ID
   */
  getTicket: async (ticketId: string): Promise<TicketDetail> => {
    const response = await apiClient.get<TicketDetail>(`${TICKETS_BASE}/${ticketId}`);
    return response.data;
  },

  /**
   * Create a new ticket
   */
  createTicket: async (data: CreateTicketData): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(`${TICKETS_BASE}/`, data);
    return response.data;
  },

  /**
   * Close a ticket
   */
  closeTicket: async (ticketId: string, feedback?: string): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(`${TICKETS_BASE}/${ticketId}/close`, {
      feedback,
    });
    return response.data;
  },

  /**
   * Reopen a closed ticket
   */
  reopenTicket: async (ticketId: string): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(`${TICKETS_BASE}/${ticketId}/reopen`);
    return response.data;
  },

  /**
   * Get comments for a ticket
   */
  getComments: async (ticketId: string): Promise<{ comments: TicketComment[]; total: number }> => {
    const response = await apiClient.get<{ comments: TicketComment[]; total: number }>(
      `${TICKETS_BASE}/${ticketId}/comments`
    );
    return response.data;
  },

  /**
   * Add a comment to a ticket
   */
  addComment: async (ticketId: string, data: CreateCommentData): Promise<TicketComment> => {
    const response = await apiClient.post<TicketComment>(
      `${TICKETS_BASE}/${ticketId}/comments`,
      data
    );
    return response.data;
  },

  /**
   * Get available products for ticket creation
   */
  getAvailableProducts: async (): Promise<{ products: string[] }> => {
    const response = await apiClient.get<{ products: string[] }>(`${TICKETS_BASE}/products`);
    return response.data;
  },

  /**
   * Get ticket statistics
   */
  getStats: async (): Promise<TicketStats> => {
    const response = await apiClient.get<TicketStats>(`${TICKETS_BASE}/stats/summary`);
    return response.data;
  },
};
