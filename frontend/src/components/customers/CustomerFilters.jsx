import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersAPI } from '@/services/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, Filter } from 'lucide-react'

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Government',
  'Non-profit',
  'Other',
]

const STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'churned', label: 'Churned' },
  { value: 'onboarding', label: 'Onboarding' },
]

const PRODUCTS = [
  { value: 'all', label: 'All Products' },
  { value: 'MonetX', label: 'MonetX' },
  { value: 'SupportX', label: 'SupportX' },
  { value: 'GreenX', label: 'GreenX' },
]

export function CustomerFilters({ filters, onFiltersChange, onClear }) {
  const [localSearch, setLocalSearch] = useState(filters.search || '')

  // Fetch account managers for dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersAPI.getAll({ role: 'account_manager' }).then(res => res.data),
  })

  const accountManagers = usersData?.users || []

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch])

  // Sync local search with filters
  useEffect(() => {
    setLocalSearch(filters.search || '')
  }, [filters.search])

  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value === 'all' ? '' : value })
  }

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.industry ||
    filters.product ||
    filters.account_manager_id

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Filters</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="ml-auto gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <X className="w-3 h-3" />
            Clear all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search company..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Industry Filter */}
        <Select
          value={filters.industry || 'all'}
          onValueChange={(value) => handleFilterChange('industry', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Product Filter */}
        <Select
          value={filters.product || 'all'}
          onValueChange={(value) => handleFilterChange('product', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCTS.map((product) => (
              <SelectItem key={product.value} value={product.value}>
                {product.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Account Manager Filter */}
        <Select
          value={filters.account_manager_id || 'all'}
          onValueChange={(value) => handleFilterChange('account_manager_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Account Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {accountManagers.map((manager) => (
              <SelectItem key={manager.id} value={manager.id.toString()}>
                {manager.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
