import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, RefreshCw, HeadphonesIcon, AlertOctagon } from 'lucide-react'

export default function ServerError({ error, resetErrorBoundary }) {
  const handleRetry = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="relative inline-block mb-8">
          <span className="text-[150px] font-bold text-slate-100 select-none">500</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-danger-50 rounded-full">
              <AlertOctagon className="w-16 h-16 text-danger" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">Server Error</h1>
        <p className="text-slate-500 mb-6">
          Oops! Something went wrong on our end. Our team has been notified and we're working to fix it.
        </p>

        {/* Error details (in development) */}
        {error && process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-slate-100 rounded-lg text-left">
            <p className="text-sm font-mono text-danger mb-1">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="text-xs text-slate-500 overflow-x-auto max-h-32">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Link to="/dashboard">
            <Button className="gap-2">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-400 mb-2">Need help?</p>
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
            <HeadphonesIcon className="w-4 h-4" />
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  )
}
