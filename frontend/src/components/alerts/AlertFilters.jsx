import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersAPI } from '@/services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  X,
  Filter,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingDown,
  Calendar,
  Star,
  Zap,
  Clock,
} from 'lucide-react'

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'snoozed', label: 'Snoozed' },
]

const severityOptions = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical', icon: AlertOctagon, color: 'text-danger' },
  { value: 'high', label: 'High', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'medium', label: 'Medium', icon: AlertCircle, color: 'text-warning' },
  { value: 'low', label: 'Low', icon: Info, color: 'text-primary' },
]

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'health_drop', label: 'Health Drop', icon: TrendingDown },
  { value: 'contract_expiry', label: 'Contract Expiry', icon: Calendar },
  { value: 'low_csat', label: 'Low CSAT', icon: Star },
  { value: 'escalation', label: 'Escalation', icon: AlertTriangle },
  { value: 'inactivity', label: 'Inactivity', icon: Clock },
  { value: 'usage_drop', label: 'Usage Drop', icon: Zap },
]

export function AlertFilters({ filters, onFiltersChange, onClear }) {
  const [localFilters, setLocalFilters] = useState(filters)

  // Fetch customers for search
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
  })

  const customers = customersData?.customers || []

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  // Count active filters
  const activeFilterCount = [
    localFilters.status && localFilters.status !== 'all',
    localFilters.severity && localFilters.severity !== 'all',
    localFilters.type && localFilters.type !== 'all',
    localFilters.customerId,
    localFilters.search,
    localFilters.dateFrom,
    localFilters.dateTo,
  ].filter(Boolean).length

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search alerts..."
              className="pl-9"
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <Select
            value={localFilters.status || 'all'}
            onValueChange={(v) => handleFilterChange('status', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Severity Filter */}
          <Select
            value={localFilters.severity || 'all'}
            onValueChange={(v) => handleFilterChange('severity', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              {severityOptions.map((option) => {
                const Icon = option.icon
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className={`w-4 h-4 ${option.color || ''}`} />}
                      {option.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select
            value={localFilters.type || 'all'}
            onValueChange={(v) => handleFilterChange('type', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Alert Type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4" />}
                      {option.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Customer Filter */}
          <Select
            value={localFilters.customerId || 'all'}
            onValueChange={(v) => handleFilterChange('customerId', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-[140px]"
              value={localFilters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              placeholder="From"
            />
            <span className="text-slate-400">to</span>
            <Input
              type="date"
              className="w-[140px]"
              value={localFilters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              placeholder="To"
            />
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">Active filters:</span>
            {localFilters.status && localFilters.status !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs capitalize">
                {localFilters.status}
                <button onClick={() => handleFilterChange('status', '')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {localFilters.severity && localFilters.severity !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs capitalize">
                {localFilters.severity}
                <button onClick={() => handleFilterChange('severity', '')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {localFilters.type && localFilters.type !== 'all' && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {typeOptions.find(t => t.value === localFilters.type)?.label || localFilters.type}
                <button onClick={() => handleFilterChange('type', '')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {localFilters.customerId && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {customers.find(c => c.id === localFilters.customerId)?.company_name || 'Customer'}
                <button onClick={() => handleFilterChange('customerId', '')}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AlertTypeIcon({ type, className = 'w-4 h-4' }) {
  const icons = {
    health_drop: TrendingDown,
    contract_expiry: Calendar,
    low_csat: Star,
    escalation: AlertTriangle,
    inactivity: Clock,
    usage_drop: Zap,
  }

  const Icon = icons[type] || AlertCircle
  return <Icon className={className} />
}

export function SeverityBadge({ severity, size = 'default' }) {
  const config = {
    critical: { variant: 'danger', label: 'Critical' },
    high: { variant: 'warning', label: 'High' },
    medium: { variant: 'secondary', label: 'Medium' },
    low: { variant: 'primary', label: 'Low' },
  }

  const { variant, label } = config[severity] || config.medium
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5' : ''

  return <Badge variant={variant} className={sizeClass}>{label}</Badge>
}

export function StatusBadge({ status }) {
  const config = {
    active: { variant: 'danger', label: 'Active' },
    resolved: { variant: 'success', label: 'Resolved' },
    snoozed: { variant: 'secondary', label: 'Snoozed' },
  }

  const { variant, label } = config[status] || config.active
  return <Badge variant={variant}>{label}</Badge>
}
