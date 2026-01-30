import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Helper to get/set storage based on remember me preference
  const getStorage = () => {
    // Check if we're using session storage (user didn't select "remember me")
    if (sessionStorage.getItem('access_token')) {
      return sessionStorage
    }
    return localStorage
  }

  const clearAllStorage = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user')
  }

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      const storage = getStorage()
      const token = storage.getItem('access_token')
      const savedUser = storage.getItem('user')

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser))
          // Verify token is still valid
          const response = await authAPI.getMe()
          setUser(response.data)
          storage.setItem('user', JSON.stringify(response.data))
        } catch (err) {
          // Token invalid, clear storage
          clearAllStorage()
          setUser(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (email, password, rememberMe = true) => {
    setLoading(true)
    setError(null)
    try {
      // Get tokens
      const response = await authAPI.login(email, password)
      const { access_token, refresh_token } = response.data

      // Use localStorage if remember me, otherwise sessionStorage (clears on browser close)
      const storage = rememberMe ? localStorage : sessionStorage

      // Clear any existing tokens from both storages first
      clearAllStorage()

      storage.setItem('access_token', access_token)
      storage.setItem('refresh_token', refresh_token)

      // Fetch user data
      const userResponse = await authAPI.getMe()
      const userData = userResponse.data

      storage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      navigate('/dashboard')
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch (err) {
      // Ignore logout errors
    } finally {
      clearAllStorage()
      setUser(null)
      navigate('/login')
    }
  }, [navigate])

  const updateProfile = useCallback(async (data) => {
    try {
      const response = await authAPI.updateProfile(data)
      setUser(response.data)
      const storage = getStorage()
      storage.setItem('user', JSON.stringify(response.data))
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.detail || 'Profile update failed.'
      return { success: false, error: message }
    }
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      await authAPI.changePassword(currentPassword, newPassword)
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.detail || 'Password change failed.'
      return { success: false, error: message }
    }
  }, [])

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    login,
    logout,
    updateProfile,
    changePassword,
    clearError: () => setError(null),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
