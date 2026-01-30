import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from './ScoreGauge'
import { CompactTrendIndicator } from './ScoreTrendIndicator'
import { formatDistanceToNow } from 'date-fns'
import {
  Building2,
  Calendar,
  User,
  ChevronRight,
  AlertTriangle,
  DollarSign,
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

export function HealthScoreGrid({ customers, onViewDetails, isLoading }) {
  if (isLoading) {
    return <HealthScoreGridSkeleton />
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No customers found matching your filters.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {customers.map((customer) => (
        <HealthScoreCard
          key={customer.id}
          customer={customer}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}

function HealthScoreCard({ customer, onViewDetails }) {
  const score = customer.health_score || 0
  const scoreStatus = getScoreStatus(score)
  const config = statusConfig[scoreStatus]
  const trend = customer.score_trend || 'stable'
  const change = customer.score_change || 0

  const daysUntilRenewal = customer.contract_end_date
    ? Math.ceil((new Date(customer.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className="card-hover group cursor-pointer" onClick={() => onViewDetails(customer)}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
              {customer.company_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 truncate group-hover:text-primary transition-colors">
                {customer.company_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={customerStatusConfig[customer.status] || 'secondary'} className="text-[10px] px-1.5">
                  {customer.status?.replace('_', ' ')}
                </Badge>
                {customer.industry && (
                  <span className="text-xs text-slate-400 truncate">{customer.industry}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Score Gauge */}
        <div className="flex items-center justify-center py-4">
          <ScoreGauge score={score} size="lg" showLabel={false} />
        </div>

        {/* Score Status & Trend */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Badge variant={config.color} className="px-3">
            {config.label}
          </Badge>
          <CompactTrendIndicator trend={trend} change={change} />
        </div>

        {/* Score Factors Preview */}
        {customer.score_factors && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <FactorMini
              label="Usage"
              value={customer.score_factors.usage_score}
            />
            <FactorMini
              label="Engagement"
              value={customer.score_factors.engagement_score}
            />
            <FactorMini
              label="CSAT"
              value={customer.score_factors.csat_score}
            />
          </div>
        )}

        {/* Footer Info */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          {customer.account_manager_name && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <User className="w-3 h-3" />
              <span className="truncate">{customer.account_manager_name}</span>
            </div>
          )}
          {daysUntilRenewal !== null && (
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className={daysUntilRenewal <= 30 ? 'text-danger font-medium' : 'text-slate-500'}>
                {daysUntilRenewal > 0 ? `${daysUntilRenewal}d until renewal` : 'Renewal overdue'}
              </span>
              {daysUntilRenewal <= 30 && daysUntilRenewal > 0 && (
                <AlertTriangle className="w-3 h-3 text-warning" />
              )}
            </div>
          )}
          {customer.contract_value && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <DollarSign className="w-3 h-3" />
              <span>${(customer.contract_value / 1000).toFixed(0)}k ARR</span>
            </div>
          )}
        </div>

        {/* View Details Link */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <Link
            to={`/customers/${customer.id}?tab=health`}
            className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function FactorMini({ label, value }) {
  const score = value || 0
  const color = score >= 80 ? 'text-success' : score >= 60 ? 'text-primary' : score >= 40 ? 'text-warning' : 'text-danger'

  return (
    <div className="text-center">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{score}</p>
    </div>
  )
}

function getScoreStatus(score) {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'at_risk'
  return 'critical'
}

function HealthScoreGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex justify-center py-4">
              <div className="w-24 h-24 rounded-full border-4 border-slate-200 animate-pulse" />
            </div>
            <div className="flex justify-center gap-3 mb-4">
              <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-6 w-12 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3].map((j) => (
                <div key={j} className="text-center">
                  <div className="h-2 w-10 mx-auto bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-6 mx-auto bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function HealthScoreGridCompact({ customers, onViewDetails, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-slate-200 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!customers || customers.length === 0) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {customers.map((customer) => (
        <Card
          key={customer.id}
          className="card-hover cursor-pointer"
          onClick={() => onViewDetails(customer)}
        >
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-slate-700 truncate mb-2">
              {customer.company_name}
            </p>
            <ScoreGauge score={customer.health_score || 0} size="sm" showLabel={false} />
            <div className="mt-2">
              <CompactTrendIndicator
                trend={customer.score_trend}
                change={customer.score_change}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
