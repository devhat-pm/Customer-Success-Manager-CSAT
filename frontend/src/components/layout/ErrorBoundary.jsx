import { Component } from 'react'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Log error to service (replace with actual error logging)
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-danger-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-danger" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Please try refreshing the page or going back to the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-4 bg-slate-100 rounded-lg overflow-auto max-h-40">
                  <p className="text-sm font-mono text-danger">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleRefresh} variant="outline" className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Refresh Page
                </Button>
                <Button onClick={this.handleGoHome} className="gap-2">
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Hook-based error fallback for React Query errors
export function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Card className="max-w-lg mx-auto my-8">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-danger-50 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <CardTitle className="text-lg">Failed to load data</CardTitle>
        <CardDescription>
          {error?.message || 'An error occurred while fetching data.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={resetErrorBoundary} variant="outline" className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}
