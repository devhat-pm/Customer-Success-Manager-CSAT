import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Mail,
  AlertCircle,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react'
import { InlineLoader } from '@/components/layout/LoadingSpinner'
import { authAPI } from '@/services/api'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data) => {
    setError(null)
    try {
      await authAPI.forgotPassword(data.email)
      setIsSubmitted(true)
    } catch (err) {
      // Always show success to prevent email enumeration
      setIsSubmitted(true)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Check your email
            </h2>
            <p className="text-slate-500 mb-6">
              If an account exists with that email address, we've sent password reset instructions.
            </p>
            <p className="text-sm text-slate-400 mb-6">
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
              Forgot your password?
            </h2>
            <p className="text-slate-500">
              Enter your email address and we'll send you a link to reset your password.
            </p>
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

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="h-12 pl-12 text-base border-slate-200 focus:border-primary focus:ring-primary/20"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <InlineLoader className="mr-2" />
                  Sending...
                </>
              ) : (
                'Send reset link'
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
