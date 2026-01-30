import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  MessageSquare,
  MessageCircle,
  Ticket,
  Bell,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
} from 'lucide-react'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    name: 'Health Scores',
    href: '/health-scores',
    icon: HeartPulse,
  },
  {
    name: 'CSAT & Feedback',
    href: '/csat',
    icon: MessageSquare,
  },
  {
    name: 'Interactions',
    href: '/interactions',
    icon: MessageCircle,
  },
  {
    name: 'Support Tickets',
    href: '/tickets',
    icon: Ticket,
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: Bell,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen?.(false)
  }, [location.pathname, setMobileOpen])

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen?.(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [setMobileOpen])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const getInitials = (name) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <div className={cn(
          'flex items-center gap-3 overflow-hidden transition-all duration-300',
          !isMobile && collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'
        )}>
          <img
            src="/logo.svg"
            alt="Success Manager"
            className="h-8 w-auto"
          />
        </div>

        {!isMobile && collapsed && (
          <div className="flex items-center justify-center flex-shrink-0 mx-auto">
            <img
              src="/logo.svg"
              alt="Success Manager"
              className="h-7 w-auto"
            />
          </div>
        )}

        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3">
        <ul className="space-y-1" role="navigation" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href ||
                            location.pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <li key={item.name}>
                {!isMobile && collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.href}
                        className={cn(
                          'flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <NavLink
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary font-medium'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} />
                    <span className="truncate">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-primary" />
                    )}
                  </NavLink>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-slate-100 p-3 safe-area-bottom">
        {!isMobile && collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label={`Logged in as ${user?.full_name}. Click to logout.`}
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={user?.avatar} alt={user?.full_name} />
                  <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <div className="text-sm">
                <p className="font-medium">{user?.full_name}</p>
                <p className="text-slate-400 text-xs">{user?.email}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <Avatar className="w-9 h-9">
              <AvatarImage src={user?.avatar} alt={user?.full_name} />
              <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-slate-400 hover:text-danger hover:bg-danger-50 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-white border-r border-slate-100 flex flex-col lg:hidden',
          'w-[280px] transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Mobile navigation"
      >
        <SidebarContent isMobile={true} />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-100 transition-all duration-300 flex-col hidden lg:flex',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
        aria-label="Main navigation"
      >
        <SidebarContent />

        {/* Collapse Toggle (Desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  )
}

// Mobile menu toggle button component
export function MobileMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
      aria-label="Open navigation menu"
    >
      <Menu className="w-5 h-5 text-slate-600" />
    </button>
  )
}
