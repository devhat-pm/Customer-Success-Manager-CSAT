import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block mb-8">
          <span className="text-[150px] font-bold text-slate-100 select-none">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-20 h-20 text-primary/30" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. The page might have been
          moved, deleted, or never existed.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Link to="/dashboard">
            <Button className="gap-2">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
