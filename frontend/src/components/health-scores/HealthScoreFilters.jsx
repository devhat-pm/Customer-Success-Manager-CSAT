import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usersAPI, customersAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Filter, X, RotateCcw, TrendingUp, Minus, TrendingDown } from 'lucide-react'

export function HealthScoreFilters({ filters, onFiltersChange, onClear, collapsed = false }) {
  const [localFilters, setLocalFilters] = useState(filters)
  const [scoreRange, setScoreRange] = useState([filters.minScore || 0, filters.maxScore || 100])

  // Fetch account managers
  const { data: usersData } = useQuery({
    queryKey: ['users-managers'],
    queryFn: () => usersAPI.getAll({ role: 'csm', limit: 100 }).then(res => res.data),
  })

  // Fetch products (from deployments or a products endpoint)
  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => customersAPI.getAll({ limit: 1 }).then(res => {
      // This would ideally come from a products endpoint
      return ['SupportX Core', 'SupportX Pro', 'SupportX Enterprise', 'Add-on: Analytics', 'Add-on: AI Assistant']
    }),
  })

  const accountManagers = usersData?.users || []
  const products = productsData || []

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
    setScoreRange([filters.minScore || 0, filters.maxScore || 100])
  }, [filters])

  // Handle filter change
  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  // Handle score range change (debounced)
  const handleScoreRangeChange = (values) => {
    setScoreRange(values)
  }

  const handleScoreRangeCommit = (values) => {
    const newFilters = {
      ...localFilters,
      minScore: values[0],
      maxScore: values[1],
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  // Count active filters
  const activeFilterCount = [
    localFilters.trend,
    localFilters.product,
    localFilters.accountManagerId,
    localFilters.status,
    (scoreRange[0] > 0 || scoreRange[1] < 100),
  ].filter(Boolean).length

  // Get score status from range
  const getScoreStatus = () => {
    if (scoreRange[1] <= 40) return 'Critical'
    if (scoreRange[1] <= 60) return 'At Risk'
    if (scoreRange[0] >= 80) return 'Excellent'
    if (scoreRange[0] >= 60) return 'Good'
    return 'All'
  }

  if (collapsed) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 h-7">
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Score Range</Label>
            <span className="text-xs text-slate-500">
              {scoreRange[0]} - {scoreRange[1]}
            </span>
          </div>
          <Slider
            value={scoreRange}
            onValueChange={handleScoreRangeChange}
            onValueCommit={handleScoreRangeCommit}
            min={0}
            max={100}
            step={5}
            className="py-2"
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>0</span>
            <Badge
              variant={
                getScoreStatus() === 'Critical' ? 'danger' :
                getScoreStatus() === 'At Risk' ? 'warning' :
                getScoreStatus() === 'Excellent' ? 'success' :
                getScoreStatus() === 'Good' ? 'primary' :
                'secondary'
              }
              className="text-[10px] px-1.5"
            >
              {getScoreStatus()}
            </Badge>
            <span>100</span>
          </div>
        </div>

        {/* Quick Score Filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Filters</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={scoreRange[0] === 0 && scoreRange[1] === 40 ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setScoreRange([0, 40])
                handleScoreRangeCommit([0, 40])
              }}
            >
              Critical (0-40)
            </Button>
            <Button
              variant={scoreRange[0] === 40 && scoreRange[1] === 60 ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setScoreRange([40, 60])
                handleScoreRangeCommit([40, 60])
              }}
            >
              At Risk (40-60)
            </Button>
            <Button
              variant={scoreRange[0] === 60 && scoreRange[1] === 80 ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setScoreRange([60, 80])
                handleScoreRangeCommit([60, 80])
              }}
            >
              Good (60-80)
            </Button>
            <Button
              variant={scoreRange[0] === 80 && scoreRange[1] === 100 ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setScoreRange([80, 100])
                handleScoreRangeCommit([80, 100])
              }}
            >
              Excellent (80+)
            </Button>
          </div>
        </div>

        {/* Trend Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trend</Label>
          <Select
            value={localFilters.trend || 'all'}
            onValueChange={(value) => handleFilterChange('trend', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All trends" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trends</SelectItem>
              <SelectItem value="improving">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-success" />
                  Improving
                </div>
              </SelectItem>
              <SelectItem value="stable">
                <div className="flex items-center gap-2">
                  <Minus className="w-3 h-3 text-slate-400" />
                  Stable
                </div>
              </SelectItem>
              <SelectItem value="declining">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3 h-3 text-danger" />
                  Declining
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Customer Status</Label>
          <Select
            value={localFilters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Product</Label>
          <Select
            value={localFilters.product || 'all'}
            onValueChange={(value) => handleFilterChange('product', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product} value={product}>
                  {product}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Account Manager Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Account Manager</Label>
          <Select
            value={localFilters.accountManagerId || 'all'}
            onValueChange={(value) => handleFilterChange('accountManagerId', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Managers</SelectItem>
              {accountManagers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Tags */}
        {activeFilterCount > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <Label className="text-xs text-slate-400 mb-2 block">Active Filters</Label>
            <div className="flex flex-wrap gap-1">
              {(scoreRange[0] > 0 || scoreRange[1] < 100) && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Score: {scoreRange[0]}-{scoreRange[1]}
                  <button
                    onClick={() => {
                      setScoreRange([0, 100])
                      handleScoreRangeCommit([0, 100])
                    }}
                    className="ml-1 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {localFilters.trend && (
                <Badge variant="secondary" className="gap-1 text-xs capitalize">
                  {localFilters.trend}
                  <button
                    onClick={() => handleFilterChange('trend', '')}
                    className="ml-1 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {localFilters.status && (
                <Badge variant="secondary" className="gap-1 text-xs capitalize">
                  {localFilters.status.replace('_', ' ')}
                  <button
                    onClick={() => handleFilterChange('status', '')}
                    className="ml-1 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {localFilters.product && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {localFilters.product}
                  <button
                    onClick={() => handleFilterChange('product', '')}
                    className="ml-1 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {localFilters.accountManagerId && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Manager
                  <button
                    onClick={() => handleFilterChange('accountManagerId', '')}
                    className="ml-1 hover:text-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function HealthScoreFiltersCompact({ filters, onFiltersChange, onClear }) {
  const activeFilterCount = [
    filters.trend,
    filters.product,
    filters.accountManagerId,
    filters.status,
    (filters.minScore > 0 || filters.maxScore < 100),
  ].filter(Boolean).length

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Score Range Dropdown */}
      <Select
        value={
          filters.minScore === 0 && filters.maxScore === 40 ? 'critical' :
          filters.minScore === 40 && filters.maxScore === 60 ? 'at_risk' :
          filters.minScore === 60 && filters.maxScore === 80 ? 'good' :
          filters.minScore === 80 && filters.maxScore === 100 ? 'excellent' :
          'all'
        }
        onValueChange={(value) => {
          const ranges = {
            all: { minScore: 0, maxScore: 100 },
            critical: { minScore: 0, maxScore: 40 },
            at_risk: { minScore: 40, maxScore: 60 },
            good: { minScore: 60, maxScore: 80 },
            excellent: { minScore: 80, maxScore: 100 },
          }
          onFiltersChange({ ...filters, ...ranges[value] })
        }}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Score range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Scores</SelectItem>
          <SelectItem value="critical">Critical (0-40)</SelectItem>
          <SelectItem value="at_risk">At Risk (40-60)</SelectItem>
          <SelectItem value="good">Good (60-80)</SelectItem>
          <SelectItem value="excellent">Excellent (80+)</SelectItem>
        </SelectContent>
      </Select>

      {/* Trend Filter */}
      <Select
        value={filters.trend || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, trend: value === 'all' ? '' : value })}
      >
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Trend" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Trends</SelectItem>
          <SelectItem value="improving">Improving</SelectItem>
          <SelectItem value="stable">Stable</SelectItem>
          <SelectItem value="declining">Declining</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Button */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 px-2">
          <X className="w-4 h-4 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  )
}
