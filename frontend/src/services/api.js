import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management - supports both localStorage (remember me) and sessionStorage
const getStorage = () => {
  // Check sessionStorage first (user didn't select "remember me")
  if (sessionStorage.getItem('access_token')) {
    return sessionStorage
  }
  return localStorage
}

export const getAccessToken = () => {
  return sessionStorage.getItem('access_token') || localStorage.getItem('access_token')
}

const getRefreshToken = () => {
  return sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token')
}

const setTokens = (accessToken, refreshToken) => {
  const storage = getStorage()
  storage.setItem('access_token', accessToken)
  if (refreshToken) {
    storage.setItem('refresh_token', refreshToken)
  }
}

const clearTokens = () => {
  // Clear from both storages
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('user')
}

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle token refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is not 401 or request has already been retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // If already refreshing, queue the request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
        .catch(err => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      })

      const { access_token, refresh_token: newRefreshToken } = response.data
      setTokens(access_token, newRefreshToken)

      processQueue(null, access_token)

      originalRequest.headers.Authorization = `Bearer ${access_token}`
      return api(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// Auth API
export const authAPI = {
  login: (email, password) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    return api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  },

  register: (userData) =>
    api.post('/auth/register', userData),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  logout: () => {
    const refreshToken = getRefreshToken()
    return api.post('/auth/logout', { refresh_token: refreshToken })
  },

  getMe: () =>
    api.get('/auth/me'),

  updateProfile: (data) =>
    api.put('/auth/me', data),

  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  validateResetToken: (token) =>
    api.get(`/auth/reset-password/validate/${token}`),

  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    }),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () =>
    api.get('/dashboard/stats'),

  getHealthDistribution: () =>
    api.get('/dashboard/health-distribution'),

  getHealthTrends: (params) =>
    api.get('/dashboard/health-trends', { params }),

  getCSATTrends: (params) =>
    api.get('/dashboard/csat-trends', { params }),

  getCustomerSegments: () =>
    api.get('/dashboard/customer-segments'),

  getUpcomingRenewals: () =>
    api.get('/dashboard/upcoming-renewals'),

  getRecentActivity: (params) =>
    api.get('/dashboard/recent-activity', { params }),

  getProductPerformance: () =>
    api.get('/dashboard/product-performance'),

  getAccountManagerPerformance: () =>
    api.get('/dashboard/account-manager-performance'),

  getOverview: () =>
    api.get('/dashboard/overview'),

  getTopPerformers: (limit = 5) =>
    api.get('/dashboard/top-performers', { params: { limit } }),

  getNeedsAttention: (limit = 10) =>
    api.get('/dashboard/needs-attention', { params: { limit } }),
}

// Customers API
export const customersAPI = {
  getAll: (params) =>
    api.get('/customers', { params }),

  getById: (id) =>
    api.get(`/customers/${id}`),

  create: (data) =>
    api.post('/customers', data),

  update: (id, data) =>
    api.put(`/customers/${id}`, data),

  delete: (id) =>
    api.delete(`/customers/${id}`),

  getTimeline: (id, params) =>
    api.get(`/customers/${id}/timeline`, { params }),

  getHealthHistory: (id, params) =>
    api.get(`/customers/${id}/health-history`, { params }),

  search: (query) =>
    api.get('/customers/search', { params: { q: query } }),

  getAccountManagers: () =>
    api.get('/customers/account-managers'),

  getIndustries: () =>
    api.get('/customers/industries'),

  getAtRisk: () =>
    api.get('/customers/at-risk'),

  getExpiringSoon: (days = 90) =>
    api.get('/customers/expiring-soon', { params: { days } }),
}

// Deployments API
export const deploymentsAPI = {
  getAll: (params) =>
    api.get('/deployments', { params }),

  getById: (id) =>
    api.get(`/deployments/${id}`),

  create: (data) =>
    api.post('/deployments', data),

  update: (id, data) =>
    api.put(`/deployments/${id}`, data),

  delete: (id) =>
    api.delete(`/deployments/${id}`),

  getExpiring: (days = 30) =>
    api.get('/deployments/expiring', { params: { days } }),

  getByProduct: (product) =>
    api.get('/deployments/by-product', { params: { product } }),
}

// Health Scores API
export const healthScoresAPI = {
  getAll: (params) =>
    api.get('/health-scores', { params }),

  getById: (id) =>
    api.get(`/health-scores/${id}`),

  getByCustomer: (customerId, params) =>
    api.get(`/health-scores/customer/${customerId}`, { params }),

  calculate: (customerId) =>
    api.post(`/health-scores/calculate/${customerId}`),

  calculateAll: () =>
    api.post('/health-scores/calculate-all'),

  getSummary: () =>
    api.get('/health-scores/summary'),
}

// CSAT API
export const csatAPI = {
  getAll: (params) =>
    api.get('/csat', { params }),

  getById: (id) =>
    api.get(`/csat/${id}`),

  submit: (data) =>
    api.post('/csat', data),

  getCustomerSummary: (customerId) =>
    api.get(`/csat/customer/${customerId}/summary`),

  getAnalytics: () =>
    api.get('/csat/analytics'),

  generateSurveyLink: (data) =>
    api.post('/csat/survey-link', data),
}

// Survey Requests API (for sending surveys via email)
export const surveyRequestsAPI = {
  getAll: (params) =>
    api.get('/survey-requests', { params }),

  getById: (id) =>
    api.get(`/survey-requests/${id}`),

  create: (data) =>
    api.post('/survey-requests', data),

  sendReminder: (id) =>
    api.post(`/survey-requests/${id}/reminder`),

  cancel: (id) =>
    api.post(`/survey-requests/${id}/cancel`),

  getStats: () =>
    api.get('/survey-requests/stats'),
}

// Interactions API
export const interactionsAPI = {
  getAll: (params) =>
    api.get('/interactions', { params }),

  getById: (id) =>
    api.get(`/interactions/${id}`),

  create: (data) =>
    api.post('/interactions', data),

  update: (id, data) =>
    api.put(`/interactions/${id}`, data),

  delete: (id) =>
    api.delete(`/interactions/${id}`),

  getByCustomer: (customerId, params) =>
    api.get(`/interactions/customer/${customerId}`, { params }),

  getPendingFollowups: (params) =>
    api.get('/interactions/pending-followups', { params }),

  getSummary: () =>
    api.get('/interactions/summary'),
}

// Tickets API
export const ticketsAPI = {
  getAll: (params) =>
    api.get('/tickets', { params }),

  getById: (id) =>
    api.get(`/tickets/${id}`),

  create: (data) =>
    api.post('/tickets', data),

  update: (id, data) =>
    api.put(`/tickets/${id}`, data),

  delete: (id) =>
    api.delete(`/tickets/${id}`),

  getStats: (params) =>
    api.get('/tickets/stats', { params }),

  getCritical: () =>
    api.get('/tickets/critical'),

  getAtRisk: (threshold = 80) =>
    api.get('/tickets/sla-at-risk', { params: { threshold } }),

  getByCustomer: (customerId, params) =>
    api.get(`/tickets/customer/${customerId}`, { params }),

  checkSlaBreaches: () =>
    api.post('/tickets/check-sla-breaches'),
}

// Activities API
export const activitiesAPI = {
  getAll: (params) =>
    api.get('/activities', { params }),

  getById: (id) =>
    api.get(`/activities/${id}`),

  create: (data) =>
    api.post('/activities', data),

  update: (id, data) =>
    api.put(`/activities/${id}`, data),

  delete: (id) =>
    api.delete(`/activities/${id}`),

  getRecent: (limit = 20) =>
    api.get('/activities/recent', { params: { limit } }),

  getTypes: () =>
    api.get('/activities/types'),

  getStats: (params) =>
    api.get('/activities/stats', { params }),

  getCustomerTimeline: (customerId, limit = 50) =>
    api.get(`/activities/customer/${customerId}/timeline`, { params: { limit } }),
}

// Alerts API
export const alertsAPI = {
  getAll: (params) =>
    api.get('/alerts', { params }),

  getById: (id) =>
    api.get(`/alerts/${id}`),

  create: (data) =>
    api.post('/alerts', data),

  update: (id, data) =>
    api.put(`/alerts/${id}`, data),

  resolve: (id, resolvedBy) =>
    api.put(`/alerts/${id}/resolve`, { resolved_by: resolvedBy }),

  snooze: (id, snoozeDays, snoozedBy) =>
    api.put(`/alerts/${id}/snooze`, { snooze_days: snoozeDays, snoozed_by: snoozedBy }),

  bulkResolve: (alertIds, resolvedBy) =>
    api.post('/alerts/bulk-resolve', { alert_ids: alertIds, resolved_by: resolvedBy }),

  getDashboard: () =>
    api.get('/alerts/dashboard'),

  getStats: () =>
    api.get('/alerts/stats'),

  getByCustomer: (customerId, params) =>
    api.get(`/alerts/customer/${customerId}`, { params }),

  runChecks: () =>
    api.post('/alerts/run-checks'),
}

// Reports API
export const reportsAPI = {
  getScheduled: (params) =>
    api.get('/reports/scheduled', { params }),

  getScheduledById: (id) =>
    api.get(`/reports/scheduled/${id}`),

  createScheduled: (data) =>
    api.post('/reports/scheduled', data),

  updateScheduled: (id, data) =>
    api.put(`/reports/scheduled/${id}`, data),

  deleteScheduled: (id) =>
    api.delete(`/reports/scheduled/${id}`),

  toggleScheduled: (id) =>
    api.put(`/reports/scheduled/${id}/toggle`),

  generate: (data) =>
    api.post('/reports/generate', data),

  getHistory: (params) =>
    api.get('/reports/history', { params }),

  downloadReport: (historyId) =>
    api.get(`/reports/history/${historyId}/download`, { responseType: 'blob' }),

  getDashboard: () =>
    api.get('/reports/dashboard'),
}

// Users API
export const usersAPI = {
  getAll: (params) =>
    api.get('/users', { params }),

  getById: (id) =>
    api.get(`/users/${id}`),

  create: (data) =>
    api.post('/users', data),

  update: (id, data) =>
    api.put(`/users/${id}`, data),

  delete: (id) =>
    api.delete(`/users/${id}`),

  invite: (data) =>
    api.post('/users/invite', data),

  deactivate: (id) =>
    api.put(`/users/${id}/deactivate`),

  reactivate: (id) =>
    api.put(`/users/${id}/reactivate`),

  updateProfile: (data) =>
    api.put('/users/profile', data),

  changePassword: (data) =>
    api.put('/users/change-password', data),

  uploadAvatar: (formData) =>
    api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// Settings API
export const settingsAPI = {
  // Alert Settings
  getAlertSettings: () =>
    api.get('/settings/alerts'),

  updateAlertSettings: (data) =>
    api.put('/settings/alerts', data),

  // Report Settings
  getReportSettings: () =>
    api.get('/settings/reports'),

  updateReportSettings: (data) =>
    api.put('/settings/reports', data),

  uploadReportLogo: (formData) =>
    api.post('/settings/reports/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteReportLogo: () =>
    api.delete('/settings/reports/logo'),

  // Notification Settings
  getNotificationSettings: () =>
    api.get('/settings/notifications'),

  updateNotificationSettings: (data) =>
    api.put('/settings/notifications', data),

  // System Health
  getSystemHealth: () =>
    api.get('/settings/system/health'),

  // Integrations
  getIntegrations: () =>
    api.get('/settings/integrations'),

  updateIntegration: (id, data) =>
    api.put(`/settings/integrations/${id}`, data),

  testIntegration: (id) =>
    api.post(`/settings/integrations/${id}/test`),
}

// Search API
export const searchAPI = {
  global: (query, params) =>
    api.get('/search', { params: { q: query, ...params } }),

  customers: (query) =>
    api.get('/search/customers', { params: { q: query } }),

  alerts: (query) =>
    api.get('/search/alerts', { params: { q: query } }),

  interactions: (query) =>
    api.get('/search/interactions', { params: { q: query } }),
}

// Admin API
export const adminAPI = {
  seedDemoData: (clearExisting = true) =>
    api.post('/admin/seed-demo-data', null, { params: { clear_existing: clearExisting } }),

  getSystemInfo: () =>
    api.get('/admin/system-info'),

  clearDemoData: () =>
    api.delete('/admin/clear-demo-data'),
}

// Account API (2FA, Sessions, Account Management)
export const accountAPI = {
  // Two-Factor Authentication
  setup2FA: () =>
    api.post('/account/2fa/setup'),

  enable2FA: (code) =>
    api.post('/account/2fa/enable', { code }),

  disable2FA: (password) =>
    api.delete('/account/2fa/disable', { data: { password } }),

  get2FAStatus: () =>
    api.get('/account/2fa/status'),

  // Sessions
  getSessions: () =>
    api.get('/account/sessions'),

  revokeSession: (sessionId) =>
    api.delete(`/account/sessions/${sessionId}`),

  revokeAllSessions: () =>
    api.delete('/account/sessions'),

  // Account Deletion
  deleteAccount: (password) =>
    api.delete('/account/delete', { data: { password } }),
}

export default api
