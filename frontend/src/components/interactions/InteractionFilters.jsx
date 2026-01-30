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
  Phone,
  Mail,
  Video,
  MessageSquare,
  AlertTriangle,
  GraduationCap,
  Calendar,
} from 'lucide-react'

const interactionTypes = [
  { value: 'all', label: 'All Types', icon: MessageSquare },
  { value: 'support', label: 'Support', icon: MessageSquare },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'escalation', label: 'Escalation', icon: AlertTriangle },
  { value: 'training', label: 'Training', icon: GraduationCap },
]

const sentiments = [
  { value: 'all', label: 'All Sentiments' },
  { value: 'positive', label: 'Positive', color: 'success' },
  { value: 'neutral', label: 'Neutral', color: 'secondary' },
  { value: 'negative', label: 'Negative', color: 'danger' },
]

export function InteractionFilters({ filters, onFiltersChange, onClear }) {
  const [localFilters, setLocalFilters] = useState(filters)

  // Fetch customers
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
    localFilters.search,
    localFilters.customerId,
    localFilters.type && localFilters.type !== 'all',
    localFilters.sentiment && localFilters.sentiment !== 'all',
    localFilters.dateFrom,
    localFilters.dateTo,
    localFilters.followupRequired,
  ].filter(Boolean).length

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search interactions..."
              className="pl-9"
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

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

          {/* Type Filter */}
          <Select
            value={localFilters.type || 'all'}
            onValueChange={(v) => handleFilterChange('type', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {interactionTypes.map((type) => {
                const Icon = type.icon
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Sentiment Filter */}
          <Select
            value={localFilters.sentiment || 'all'}
            onValueChange={(v) => handleFilterChange('sentiment', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              {sentiments.map((sentiment) => (
                <SelectItem key={sentiment.value} value={sentiment.value}>
                  <div className="flex items-center gap-2">
                    {sentiment.color && (
                      <div className={`w-2 h-2 rounded-full bg-${sentiment.color}`} />
                    )}
                    {sentiment.label}
                  </div>
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

          {/* Follow-up Toggle */}
          <Button
            variant={localFilters.followupRequired ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('followupRequired', !localFilters.followupRequired)}
            className="gap-1"
          >
            <Calendar className="w-4 h-4" />
            Follow-up Required
          </Button>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function InteractionTypeIcon({ type, className = 'w-4 h-4' }) {
  const icons = {
    support: MessageSquare,
    meeting: Video,
    email: Mail,
    call: Phone,
    escalation: AlertTriangle,
    training: GraduationCap,
  }

  const Icon = icons[type] || MessageSquare
  return <Icon className={className} />
}

export function SentimentBadge({ sentiment }) {
  const config = {
    positive: { variant: 'success', label: 'Positive' },
    neutral: { variant: 'secondary', label: 'Neutral' },
    negative: { variant: 'danger', label: 'Negative' },
  }

  const { variant, label } = config[sentiment] || config.neutral
  return <Badge variant={variant}>{label}</Badge>
}
