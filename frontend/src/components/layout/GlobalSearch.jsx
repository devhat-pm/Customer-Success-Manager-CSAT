import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersAPI, alertsAPI, interactionsAPI } from '@/services/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Search,
  Users,
  Bell,
  MessageSquare,
  ArrowRight,
  Clock,
  Loader2,
  X,
  Command,
  CornerDownLeft,
} from 'lucide-react'

const categories = [
  { id: 'customers', label: 'Customers', icon: Users, color: 'text-primary' },
  { id: 'alerts', label: 'Alerts', icon: Bell, color: 'text-warning' },
  { id: 'interactions', label: 'Interactions', icon: MessageSquare, color: 'text-success' },
]

// Recent searches stored in localStorage
const RECENT_SEARCHES_KEY = 'recent_searches'
const MAX_RECENT_SEARCHES = 5

function GlobalSearch({ open, onOpenChange }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse recent searches')
      }
    }
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Search customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['search-customers', query],
    queryFn: () => customersAPI.search(query).then(res => res.data),
    enabled: query.length >= 2,
    staleTime: 30000,
  })

  // Search alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['search-alerts', query],
    queryFn: () => alertsAPI.getAll({ search: query, limit: 5 }).then(res => res.data),
    enabled: query.length >= 2,
    staleTime: 30000,
  })

  // Search interactions
  const { data: interactionsData, isLoading: interactionsLoading } = useQuery({
    queryKey: ['search-interactions', query],
    queryFn: () => interactionsAPI.getAll({ search: query, limit: 5 }).then(res => res.data),
    enabled: query.length >= 2,
    staleTime: 30000,
  })

  const isLoading = customersLoading || alertsLoading || interactionsLoading

  // Build results array
  const results = []

  if (customersData?.customers?.length) {
    customersData.customers.slice(0, 5).forEach(customer => {
      results.push({
        id: `customer-${customer.id}`,
        type: 'customers',
        title: customer.name,
        subtitle: customer.industry || 'Customer',
        href: `/customers/${customer.id}`,
        icon: Users,
      })
    })
  }

  if (alertsData?.alerts?.length) {
    alertsData.alerts.slice(0, 3).forEach(alert => {
      results.push({
        id: `alert-${alert.id}`,
        type: 'alerts',
        title: alert.title || alert.message,
        subtitle: alert.customer_name || 'Alert',
        href: `/alerts?id=${alert.id}`,
        icon: Bell,
      })
    })
  }

  if (interactionsData?.interactions?.length) {
    interactionsData.interactions.slice(0, 3).forEach(interaction => {
      results.push({
        id: `interaction-${interaction.id}`,
        type: 'interactions',
        title: interaction.subject || interaction.type,
        subtitle: interaction.customer_name || 'Interaction',
        href: `/interactions?id=${interaction.id}`,
        icon: MessageSquare,
      })
    })
  }

  // Save to recent searches
  const saveRecentSearch = useCallback((searchQuery, result) => {
    const newRecent = [
      { query: searchQuery, result, timestamp: Date.now() },
      ...recentSearches.filter(r => r.query !== searchQuery),
    ].slice(0, MAX_RECENT_SEARCHES)

    setRecentSearches(newRecent)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newRecent))
  }, [recentSearches])

  // Handle navigation
  const handleSelect = useCallback((result) => {
    if (query) {
      saveRecentSearch(query, result)
    }
    onOpenChange(false)
    navigate(result.href)
  }, [query, saveRecentSearch, onOpenChange, navigate])

  // Handle full search
  const handleFullSearch = useCallback(() => {
    if (query.trim()) {
      onOpenChange(false)
      navigate(`/search?q=${encodeURIComponent(query)}`)
    }
  }, [query, onOpenChange, navigate])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => Math.min(i + 1, results.length))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex === results.length) {
            handleFullSearch()
          } else if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
        case 'Escape':
          onOpenChange(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, results, selectedIndex, handleSelect, handleFullSearch, onOpenChange])

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search customers, alerts, interactions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-0 focus-visible:ring-0 text-base py-4 px-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Loading State */}
          {isLoading && query.length >= 2 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-500">Searching...</span>
            </div>
          )}

          {/* Results */}
          {!isLoading && query.length >= 2 && results.length > 0 && (
            <div className="py-2">
              {/* Group results by category */}
              {categories.map(category => {
                const categoryResults = results.filter(r => r.type === category.id)
                if (categoryResults.length === 0) return null

                return (
                  <div key={category.id}>
                    <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <category.icon className={`w-3 h-3 ${category.color}`} />
                      {category.label}
                    </div>
                    {categoryResults.map((result, idx) => {
                      const globalIndex = results.indexOf(result)
                      const Icon = result.icon

                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                            selectedIndex === globalIndex
                              ? 'bg-primary/5'
                              : 'hover:bg-slate-50'
                          )}
                        >
                          <div className={cn(
                            'p-2 rounded-lg',
                            selectedIndex === globalIndex ? 'bg-primary/10' : 'bg-slate-100'
                          )}>
                            <Icon className={cn(
                              'w-4 h-4',
                              selectedIndex === globalIndex ? 'text-primary' : 'text-slate-500'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {result.title}
                            </p>
                            <p className="text-sm text-slate-500 truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          {selectedIndex === globalIndex && (
                            <CornerDownLeft className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}

              {/* View All Results */}
              <button
                onClick={handleFullSearch}
                className={cn(
                  'w-full px-4 py-3 flex items-center justify-between text-left border-t border-slate-100 transition-colors',
                  selectedIndex === results.length
                    ? 'bg-primary/5'
                    : 'hover:bg-slate-50'
                )}
              >
                <span className="text-sm text-slate-600">
                  View all results for "{query}"
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}

          {/* No Results */}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="py-12 text-center">
              <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No results found</p>
              <p className="text-sm text-slate-400">
                Try different keywords or check your spelling
              </p>
            </div>
          )}

          {/* Recent Searches (when query is empty) */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((recent, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (recent.result) {
                      handleSelect(recent.result)
                    } else {
                      setQuery(recent.query)
                    }
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{recent.query}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions (when query is empty and no recent searches) */}
          {query.length < 2 && recentSearches.length === 0 && (
            <div className="py-8 text-center">
              <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-1">Quick Search</p>
              <p className="text-sm text-slate-400 mb-4">
                Search for customers, alerts, or interactions
              </p>
              <div className="flex items-center justify-center gap-2">
                {categories.map(cat => (
                  <Badge
                    key={cat.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-slate-200"
                    onClick={() => setQuery(`${cat.label.toLowerCase()}:`)}
                  >
                    <cat.icon className={`w-3 h-3 mr-1 ${cat.color}`} />
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                <ArrowRight className="w-2 h-2 rotate-90" />
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                <ArrowRight className="w-2 h-2 -rotate-90" />
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                Enter
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                Esc
              </kbd>
              Close
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K to open</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to open search with keyboard shortcut
function useGlobalSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { open, setOpen }
}

export { GlobalSearch, useGlobalSearch }
