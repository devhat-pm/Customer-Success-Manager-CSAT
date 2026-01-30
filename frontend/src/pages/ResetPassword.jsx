import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { InlineLoader } from '@/components/layout/LoadingSpinner'
import { authAPI } from '@/services/api'

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false)
        setIsValidToken(false)
        setValidationError('No reset token provided')
        return
      }

      try {
        const response = await authAPI.validateResetToken(token)
        if (response.data.valid) {
          setIsValidToken(true)
          setEmail(response.data.email)
        } else {
          setIsValidToken(false)
          setValidationError(response.data.message || 'Invalid or expired reset link')
        }
      } catch (err) {
        setIsValidToken(false)
        setValidationError('Invalid or expired reset link')
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const onSubmit = async (data) => {
    setError(null)
    try {
      await authAPI.resetPassword(token, data.password)
      setIsSuccess(true)
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to reset password. Please try again.'
      setError(message)
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <InlineLoader className="w-8 h-8 mx-auto mb-4" />
            <p className="text-slate-500">Validating reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Invalid Reset Link
            </h2>
            <p className="text-slate-500 mb-6">
              {validationError}
            </p>
            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full"
              >
                <Button className="w-full">
                  Request new reset link
                </Button>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Password Reset Successful
            </h2>
            <p className="text-slate-500 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link
              to="/login"
            >
              <Button className="w-full">
                Go to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img
              src="/logo.svg"
              alt="Success Manager"
              className="h-10 w-auto"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Reset your password
            </h2>
            {email && (
              <p className="text-slate-500">
                Enter a new password for <strong>{email}</strong>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className="h-12 pl-12 pr-12 text-base border-slate-200 focus:border-primary focus:ring-primary/20"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  className="h-12 pl-12 pr-12 text-base border-slate-200 focus:border-primary focus:ring-primary/20"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Password requirements */}
            <p className="text-xs text-slate-400">
              Password must be at least 8 characters long
            </p>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <InlineLoader className="mr-2" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>

            {/* Back to login */}
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
