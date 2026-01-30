import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Breadcrumb from './Breadcrumb'
import { GlobalSearch, useGlobalSearch } from './GlobalSearch'
import { cn } from '@/lib/utils'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch()

  // Restore sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar_collapsed')
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState))
    }
  }, [])

  // Save sidebar state to localStorage
  const handleSidebarCollapse = (collapsed) => {
    setSidebarCollapsed(collapsed)
    localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={handleSidebarCollapse}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      <Header
        sidebarCollapsed={sidebarCollapsed}
        onMenuClick={() => setMobileMenuOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />

      <main
        id="main-content"
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          'lg:pl-[260px]', // Full sidebar on desktop
          sidebarCollapsed && 'lg:pl-[72px]', // Collapsed sidebar on desktop
          'pl-0' // No sidebar padding on mobile
        )}
      >
        <div className="p-4 md:p-6">
          <Breadcrumb className="mb-4" />
          <Outlet />
        </div>
      </main>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
