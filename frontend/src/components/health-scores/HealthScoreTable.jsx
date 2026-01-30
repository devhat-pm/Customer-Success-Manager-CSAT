import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { MiniScoreGauge } from './ScoreGauge'
import { CompactTrendIndicator, TrendBadge } from './ScoreTrendIndicator'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

const statusConfig = {
  excellent: { color: 'success', label: 'Excellent' },
  good: { color: 'primary', label: 'Good' },
  at_risk: { color: 'warning', label: 'At Risk' },
  critical: { color: 'danger', label: 'Critical' },
}

const customerStatusConfig = {
  active: 'success',
  at_risk: 'warning',
  churned: 'danger',
  onboarding: 'secondary',
}

export function HealthScoreTable({
  customers,
  total,
  page,
  limit,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onViewDetails,
  isLoading,
  selectedIds = [],
  onSelectChange,
}) {
  const totalPages = Math.ceil(total / limit)

  const handleSort = (column) => {
    if (sortBy === column) {
      onSort(column, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(column, 'asc')
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectChange(customers.map((c) => c.id))
    } else {
      onSelectChange([])
    }
  }

  const handleSelectOne = (id, checked) => {
    if (checked) {
      onSelectChange([...selectedIds, id])
    } else {
      onSelectChange(selectedIds.filter((i) => i !== id))
    }
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="w-4 h-4 text-slate-300" />
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-primary" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary" />
    )
  }

  if (isLoading) {
    return <HealthScoreTableSkeleton />
  }

  if (!customers || customers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-slate-500">No customers found matching your filters.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {onSelectChange && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === customers.length && customers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center gap-2">
                    Customer
                    <SortIcon column="company_name" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-slate-50 text-center"
                  onClick={() => handleSort('health_score')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Score
                    <SortIcon column="health_score" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead className="text-center">Engagement</TableHead>
                <TableHead className="text-center">CSAT</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => handleSort('contract_end_date')}
                >
                  <div className="flex items-center gap-2">
                    Renewal
                    <SortIcon column="contract_end_date" />
                  </div>
                </TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const score = customer.health_score || 0
                const scoreStatus = getScoreStatus(score)
                const config = statusConfig[scoreStatus]
                const daysUntilRenewal = customer.contract_end_date
                  ? Math.ceil((new Date(customer.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => onViewDetails(customer)}
                  >
                    {onSelectChange && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(customer.id)}
                          onCheckedChange={(checked) => handleSelectOne(customer.id, checked)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {customer.company_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 hover:text-primary">
                            {customer.company_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant={customerStatusConfig[customer.status] || 'secondary'}
                              className="text-[10px] px-1.5"
                            >
                              {customer.status?.replace('_', ' ')}
                            </Badge>
                            {customer.industry && (
                              <span className="text-xs text-slate-400">{customer.industry}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <MiniScoreGauge score={score} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={config.color} className="text-xs">
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <CompactTrendIndicator
                          trend={customer.score_trend}
                          change={customer.score_change}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ScoreCell value={customer.score_factors?.usage_score} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ScoreCell value={customer.score_factors?.engagement_score} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ScoreCell value={customer.score_factors?.csat_score} />
                    </TableCell>
                    <TableCell>
                      {daysUntilRenewal !== null ? (
                        <div className="flex items-center gap-1">
                          <span className={`text-sm ${daysUntilRenewal <= 30 ? 'text-danger font-medium' : 'text-slate-600'}`}>
                            {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'Overdue'}
                          </span>
                          {daysUntilRenewal <= 30 && daysUntilRenewal > 0 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600 truncate block max-w-[120px]">
                        {customer.account_manager_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onViewDetails(customer)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Link to={`/customers/${customer.id}?tab=health`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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
              <div className="flex items-center gap-1">
                {generatePageNumbers(page, totalPages).map((p, i) => (
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8"
                      onClick={() => onPageChange(p)}
                    >
                      {p}
                    </Button>
                  )
                ))}
              </div>
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

function ScoreCell({ value }) {
  if (value === undefined || value === null) {
    return <span className="text-xs text-slate-400">-</span>
  }

  const color = value >= 80 ? 'text-success' : value >= 60 ? 'text-primary' : value >= 40 ? 'text-warning' : 'text-danger'

  return (
    <span className={`text-sm font-medium ${color}`}>{value}</span>
  )
}

function getScoreStatus(score) {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'at_risk'
  return 'critical'
}

function generatePageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total]
  }

  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, '...', current - 1, current, current + 1, '...', total]
}

function HealthScoreTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead className="text-center">Engagement</TableHead>
                <TableHead className="text-center">CSAT</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse" />
                      <div>
                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-1" />
                        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className="w-10 h-10 rounded-full border-2 border-slate-200 animate-pulse" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </TableCell>
                  {[1, 2, 3].map((j) => (
                    <TableCell key={j}>
                      <div className="flex justify-center">
                        <div className="h-4 w-8 bg-slate-200 rounded animate-pulse" />
                      </div>
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
                    </div>
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
