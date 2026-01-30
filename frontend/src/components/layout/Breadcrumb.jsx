import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const routeLabels = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  'health-scores': 'Health Scores',
  csat: 'CSAT & Feedback',
  interactions: 'Interactions',
  alerts: 'Alerts',
  reports: 'Reports',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  profile: 'Profile',
  security: 'Security',
  notifications: 'Notifications',
}

export default function Breadcrumb({ className }) {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  // Don't show breadcrumb on login page
  if (pathSegments.length === 0 || pathSegments[0] === 'login') {
    return null
  }

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/')
    const isLast = index === pathSegments.length - 1

    // Check if it's a UUID (for detail pages)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    const label = isUUID ? 'Details' : (routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1))

    return {
      label,
      path,
      isLast,
    }
  })

  return (
    <nav className={cn('flex items-center text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>

        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
            {crumb.isLast ? (
              <span className="text-slate-800 font-medium">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
