import apiClient from './client';
import { PendingSurvey, FeedbackHistoryItem, SurveyDetails, SurveyType } from '@/types';

const SURVEYS_BASE = '/portal/surveys';

export interface VoluntaryFeedbackData {
  survey_type?: SurveyType;
  score: number;
  feedback_text?: string;
  product?: string;
  anonymous?: boolean;
}

export interface SurveySubmitData {
  score: number;
  feedback_text?: string;
  submitter_name?: string;
  submitter_email?: string;
}

export const feedbackApi = {
  // Get pending surveys for authenticated customer
  getPendingSurveys: async (): Promise<{ surveys: PendingSurvey[]; count: number }> => {
    const response = await apiClient.get(`${SURVEYS_BASE}/pending`);
    return response.data;
  },

  // Get feedback history
  getFeedbackHistory: async (skip = 0, limit = 20): Promise<{ feedback: FeedbackHistoryItem[]; total: number }> => {
    const response = await apiClient.get(`${SURVEYS_BASE}/history`, {
      params: { skip, limit },
    });
    return response.data;
  },

  // Submit voluntary feedback
  submitVoluntaryFeedback: async (data: VoluntaryFeedbackData): Promise<{ message: string }> => {
    const response = await apiClient.post(`${SURVEYS_BASE}/feedback`, data);
    return response.data;
  },

  // Get products available for feedback
  getAvailableProducts: async (): Promise<{ products: string[] }> => {
    const response = await apiClient.get(`${SURVEYS_BASE}/products`);
    return response.data;
  },

  // Get survey details by token (public, no auth required)
  getSurveyByToken: async (token: string): Promise<SurveyDetails & { is_completed: boolean; customer_name: string }> => {
    const response = await apiClient.get(`${SURVEYS_BASE}/view/${token}`);
    return response.data;
  },

  // Submit survey by token (public, no auth required)
  submitSurvey: async (token: string, data: SurveySubmitData): Promise<{ message: string }> => {
    const response = await apiClient.post(`${SURVEYS_BASE}/submit/${token}`, data);
    return response.data;
  },
};

export default feedbackApi;
