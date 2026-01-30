import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, ProtectedRoute, ErrorBoundary } from '@/components/layout'
import { PageLoader } from '@/components/layout/LoadingSpinner'

// Lazy loaded pages for code splitting
const Login = lazy(() => import('@/pages/Login'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Customers = lazy(() => import('@/pages/Customers'))
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'))
const HealthScores = lazy(() => import('@/pages/HealthScores'))
const CSAT = lazy(() => import('@/pages/CSAT'))
const Interactions = lazy(() => import('@/pages/Interactions'))
const Tickets = lazy(() => import('@/pages/Tickets'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Reports = lazy(() => import('@/pages/Reports'))
const Settings = lazy(() => import('@/pages/Settings'))
const Search = lazy(() => import('@/pages/Search'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const ServerError = lazy(() => import('@/pages/ServerError'))
const PublicSurvey = lazy(() => import('@/pages/PublicSurvey'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/surveys/submit/:token" element={<PublicSurvey />} />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/health-scores" element={<HealthScores />} />
          <Route path="/csat" element={<CSAT />} />
          <Route path="/interactions" element={<Interactions />} />
          <Route path="/interactions/new" element={<Interactions openNewModal={true} />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/new" element={<Reports openGenerateModal={true} />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings/*" element={<Settings />} />
        </Route>

        {/* Error pages */}
        <Route path="/error" element={<ServerError />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
