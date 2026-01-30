import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
  Shield,
  ArrowRight
} from 'lucide-react'
import { InlineLoader } from '@/components/layout/LoadingSpinner'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

const features = [
  {
    icon: TrendingUp,
    title: 'Health Scores',
    description: 'Monitor customer health in real-time'
  },
  {
    icon: Users,
    title: 'Customer 360',
    description: 'Complete view of every customer'
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Data-driven insights and reports'
  },
  {
    icon: Shield,
    title: 'Proactive Alerts',
    description: 'Never miss critical signals'
  }
]

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, loading, error, isAuthenticated, clearError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data) => {
    clearError()
    await login(data.email, data.password, data.rememberMe)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/extravis-logo.png"
                alt="Extravis"
                className="h-10 w-auto brightness-0 invert"
              />
            </div>
          </div>

          {/* Main message */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Drive customer success with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                  confidence
                </span>
              </h2>
              <p className="text-lg text-slate-400 max-w-md">
                Empower your team with insights, automate workflows, and deliver exceptional customer experiences.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <feature.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>Trusted by leading enterprises</p>
            <p>v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <img
              src="/extravis-logo.png"
              alt="Extravis"
              className="h-10 w-auto"
            />
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Welcome back
            </h2>
            <p className="text-slate-500">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Authentication failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
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

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 focus:ring-offset-0 transition-colors"
                  {...register('rememberMe')}
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  Keep me signed in
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              disabled={isSubmitting || loading}
            >
              {(isSubmitting || loading) ? (
                <>
                  <InlineLoader className="mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            By signing in, you agree to our{' '}
            <a href="/terms-of-service" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
