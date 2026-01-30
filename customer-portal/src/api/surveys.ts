import apiClient from './client';
import axios from 'axios';
import {
  PendingSurvey,
  FeedbackHistory,
  SurveySubmission,
  PublicSurveySubmission,
  CSATSurvey,
  SurveyType,
  MessageResponse,
} from '@/types';

const SURVEYS_BASE = '/portal/surveys';
const PUBLIC_SURVEY_BASE = '/surveys/public';

export const surveysApi = {
  /**
   * Get pending surveys for the current user
   */
  getPendingSurveys: async (): Promise<{ surveys: PendingSurvey[]; count: number }> => {
    const response = await apiClient.get<{ surveys: PendingSurvey[]; count: number }>(
      `${SURVEYS_BASE}/pending`
    );
    return response.data;
  },

  /**
   * Get feedback history
   */
  getFeedbackHistory: async (
    skip = 0,
    limit = 20
  ): Promise<FeedbackHistory> => {
    const response = await apiClient.get<FeedbackHistory>(`${SURVEYS_BASE}/history`, {
      params: { skip, limit },
    });
    return response.data;
  },

  /**
   * Submit voluntary feedback (not linked to a survey request)
   */
  submitVoluntaryFeedback: async (data: {
    survey_type: SurveyType;
    score: number;
    feedback_text?: string;
    product?: string;
    anonymous?: boolean;
  }): Promise<CSATSurvey> => {
    const response = await apiClient.post<CSATSurvey>(`${SURVEYS_BASE}/feedback`, data);
    return response.data;
  },

  /**
   * Submit a survey (requires authentication)
   */
  submitSurvey: async (
    surveyRequestId: string,
    data: SurveySubmission
  ): Promise<CSATSurvey> => {
    const response = await apiClient.post<CSATSurvey>(
      `${SURVEYS_BASE}/${surveyRequestId}/submit`,
      data
    );
    return response.data;
  },

  // ==================== Public Survey API (no auth required) ====================

  /**
   * Get survey details by token (public, no auth)
   */
  getSurveyByToken: async (
    token: string
  ): Promise<{
    id: string;
    survey_type: SurveyType;
    customer_name: string;
    custom_message?: string;
    linked_ticket_number?: string;
    linked_ticket_subject?: string;
    expires_at: string;
    is_completed: boolean;
  }> => {
    const response = await axios.get(`/api/v1${PUBLIC_SURVEY_BASE}/${token}`);
    return response.data;
  },

  /**
   * Submit survey via public token (no auth required)
   */
  submitSurveyByToken: async (
    token: string,
    data: PublicSurveySubmission
  ): Promise<MessageResponse> => {
    const response = await axios.post(`/api/v1${PUBLIC_SURVEY_BASE}/${token}/submit`, data);
    return response.data;
  },
};
