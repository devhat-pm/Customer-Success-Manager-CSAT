import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  User,
  Shield,
  Users,
  Bell,
  FileText,
  Plug,
  Activity,
  ChevronRight,
} from 'lucide-react'

const settingsNavItems = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    path: '/settings/profile',
    adminOnly: false,
  },
  {
    id: 'account',
    label: 'Account',
    icon: Shield,
    path: '/settings/account',
    adminOnly: false,
  },
  {
    id: 'team',
    label: 'Team Members',
    icon: Users,
    path: '/settings/team',
    adminOnly: true,
  },
  {
    id: 'alerts',
    label: 'Alert Settings',
    icon: Bell,
    path: '/settings/alerts',
    adminOnly: false,
  },
  {
    id: 'reports',
    label: 'Report Settings',
    icon: FileText,
    path: '/settings/reports',
    adminOnly: false,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    path: '/settings/integrations',
    adminOnly: true,
  },
  {
    id: 'system',
    label: 'System Health',
    icon: Activity,
    path: '/settings/system',
    adminOnly: true,
  },
]

export function SettingsSidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.is_admin

  const filteredItems = settingsNavItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <>
      {/* Mobile: Horizontal scrollable nav */}
      <nav className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path ||
              (item.path === '/settings/profile' && location.pathname === '/settings')

            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
                  item.placeholder && 'opacity-50'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.placeholder && (
                  <span className="text-[9px] px-1 py-0.5 bg-slate-200 text-slate-500 rounded">
                    Soon
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop: Vertical sidebar */}
      <nav className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-6 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path ||
              (item.path === '/settings/profile' && location.pathname === '/settings')

            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  item.placeholder && 'opacity-50'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {item.placeholder && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded">
                    Soon
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
