import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { FullPageLoader } from './LoadingSpinner'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <FullPageLoader />
  }

  if (!isAuthenticated) {
    // Redirect to login with return path
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRole) {
    const roleHierarchy = { admin: 3, manager: 2, viewer: 1 }
    const userRoleLevel = roleHierarchy[user?.role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    if (userRoleLevel < requiredRoleLevel) {
      // User doesn't have required role
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

// HOC for admin-only routes
export function AdminRoute({ children }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
}

// HOC for manager+ routes
export function ManagerRoute({ children }) {
  return <ProtectedRoute requiredRole="manager">{children}</ProtectedRoute>
}
