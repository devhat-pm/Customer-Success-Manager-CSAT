import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { alertsAPI } from '@/services/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  Search,
  Bell,
  Plus,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  MessageSquare,
  FileText,
  Menu,
  Command,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function Header({ sidebarCollapsed, onMenuClick, onSearchClick }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const getInitials = (name) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const quickActions = [
    { label: 'Add Customer', icon: Users, href: '/customers/new' },
    { label: 'Log Interaction', icon: MessageSquare, href: '/interactions/new' },
    { label: 'Create Report', icon: FileText, href: '/reports/new' },
  ]

  // Fetch real notifications from alerts API
  const { data: alertsData } = useQuery({
    queryKey: ['header-notifications'],
    queryFn: async () => {
      try {
        const res = await alertsAPI.getAll({ status: 'active', limit: 5 })
        // Handle different response formats
        const data = res.data
        if (Array.isArray(data)) return data
        if (data?.items && Array.isArray(data.items)) return data.items
        if (data?.alerts && Array.isArray(data.alerts)) return data.alerts
        return []
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
        return []
      }
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  })

  // Transform alerts to notifications format - ensure alertsData is an array
  const alertsList = Array.isArray(alertsData) ? alertsData : []
  const notifications = alertsList.map(alert => ({
    id: alert.id,
    title: alert.severity === 'critical' ? 'Critical Alert' :
           alert.severity === 'high' ? 'High Priority' :
           alert.alert_type?.replace('_', ' ') || 'Alert',
    message: alert.message || alert.title,
    type: alert.severity === 'critical' ? 'danger' :
          alert.severity === 'high' ? 'warning' : 'default',
    time: alert.created_at ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }) : '',
    customerId: alert.customer_id,
  }))

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 bg-white border-b border-slate-100 transition-all duration-300',
        'left-0', // Full width on mobile
        'lg:left-[260px]', // Account for sidebar on desktop
        sidebarCollapsed && 'lg:left-[72px]'
      )}
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left side - Menu button and Search */}
        <div className="flex items-center gap-2 flex-1">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          {/* Search Bar */}
          <button
            onClick={onSearchClick}
            className="flex items-center gap-3 flex-1 max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left hover:bg-slate-100 hover:border-slate-300 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm hidden sm:inline">Search customers, interactions...</span>
            <span className="text-slate-400 text-sm sm:hidden">Search...</span>
            <kbd className="hidden md:flex items-center gap-0.5 ml-auto px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="gap-1 sm:gap-2 hidden sm:flex">
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Quick Action</span>
                <ChevronDown className="w-3 h-3 hidden sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {quickActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={() => navigate(action.href)}
                  className="gap-2 cursor-pointer"
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Quick Add */}
          <Button variant="default" size="icon" className="sm:hidden" onClick={() => navigate('/customers/new')}>
            <Plus className="w-4 h-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-auto py-1">
                  Mark all read
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No new notifications
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <Badge variant={notification.type === 'danger' ? 'danger' : notification.type === 'warning' ? 'warning' : 'success'}>
                          {notification.title}
                        </Badge>
                        <span className="text-xs text-slate-400 ml-auto">{notification.time}</span>
                      </div>
                      <p className="text-sm text-slate-600">{notification.message}</p>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate('/alerts')}
                className="text-center text-primary justify-center cursor-pointer"
              >
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar} alt={user?.full_name} />
                  <AvatarFallback className="text-xs">{getInitials(user?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-slate-800">
                    {user?.full_name || 'User'}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    {user?.role || 'viewer'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden md:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.full_name}</span>
                  <span className="text-xs font-normal text-slate-500">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings/profile')} className="gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer text-danger focus:text-danger">
                <LogOut className="w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
