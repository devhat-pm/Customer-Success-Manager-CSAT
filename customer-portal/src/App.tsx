import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/authStore';

// Layouts
import CustomerLayout from '@/layouts/CustomerLayout';
import AuthLayout from '@/layouts/AuthLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Main Pages
import DashboardPage from '@/pages/DashboardPage';
import TicketsPage from '@/pages/tickets/TicketsPage';
import TicketDetailPage from '@/pages/tickets/TicketDetailPage';
import CreateTicketPage from '@/pages/tickets/CreateTicketPage';
import FeedbackPage from '@/pages/feedback/FeedbackPage';
import SurveyPage from '@/pages/feedback/SurveyPage';
import ProductsPage from '@/pages/products/ProductsPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import HelpPage from '@/pages/help/HelpPage';

const App: React.FC = () => {
  const { isAuthenticated, isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    // Check if we have stored auth and set loading to false
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Survey Page (no auth required) */}
      <Route path="/survey/:token" element={<SurveyPage />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/new" element={<CreateTicketPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
      </Route>

      {/* Default Redirects */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

export default App;
