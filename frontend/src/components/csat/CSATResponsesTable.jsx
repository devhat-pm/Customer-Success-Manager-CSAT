import { useState } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, parseISO } from 'date-fns'
import {
  Search,
  Star,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Calendar,
  MessageSquare,
} from 'lucide-react'

const surveyTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'quarterly', label: 'Quarterly Review' },
  { value: 'support', label: 'Support Ticket' },
  { value: 'feature', label: 'Feature Feedback' },
]

const scoreRanges = [
  { value: 'all', label: 'All Scores' },
  { value: 'high', label: 'High (4-5)' },
  { value: 'medium', label: 'Medium (3)' },
  { value: 'low', label: 'Low (1-2)' },
]

export function CSATResponsesTable({
  responses,
  total,
  page,
  limit,
  filters,
  onFiltersChange,
  onPageChange,
  onViewResponse,
  isLoading,
}) {
  const [localFilters, setLocalFilters] = useState(filters)

  // Fetch customers for filter
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
  })

  const customers = customersData?.customers || []

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      customerId: '',
      product: '',
      surveyType: '',
      scoreRange: '',
      dateFrom: '',
      dateTo: '',
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const activeFilterCount = Object.values(localFilters).filter(Boolean).length
  const totalPages = Math.ceil(total / limit)

  if (isLoading) {
    return <CSATResponsesTableSkeleton />
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search feedback..."
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
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Survey Type */}
            <Select
              value={localFilters.surveyType || 'all'}
              onValueChange={(v) => handleFilterChange('surveyType', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Survey Type" />
              </SelectTrigger>
              <SelectContent>
                {surveyTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Score Range */}
            <Select
              value={localFilters.scoreRange || 'all'}
              onValueChange={(v) => handleFilterChange('scoreRange', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Score" />
              </SelectTrigger>
              <SelectContent>
                {scoreRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1">
                <X className="w-4 h-4" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Survey Type</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses && responses.length > 0 ? (
                responses.map((response) => (
                  <TableRow
                    key={response.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => onViewResponse(response)}
                  >
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {response.submitted_at
                          ? format(parseISO(response.submitted_at), 'MMM d, yyyy')
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                          {response.customer_name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-slate-800">
                          {response.customer_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {response.product || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {response.survey_type?.replace('_', ' ') || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <ScoreStars score={response.score} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600 truncate max-w-[200px]">
                        {response.feedback || '-'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {response.submitted_by || '-'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewResponse(response)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No responses found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScoreStars({ score }) {
  const numScore = parseInt(score) || 0
  const color = numScore >= 4 ? 'text-success' : numScore >= 3 ? 'text-warning' : 'text-danger'

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= numScore
              ? `${color} fill-current`
              : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function CSATResponsesTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex gap-3">
            <div className="h-10 flex-1 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-28 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Survey Type</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
                      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 mx-auto bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
