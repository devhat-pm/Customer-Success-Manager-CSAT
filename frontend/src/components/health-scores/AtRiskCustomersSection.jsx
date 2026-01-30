import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MiniScoreGauge } from './ScoreGauge'
import { CompactTrendIndicator } from './ScoreTrendIndicator'
import { formatCurrency } from '@/lib/utils'
import {
  AlertTriangle,
  TrendingDown,
  Calendar,
  DollarSign,
  ChevronRight,
  User,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'

export function AtRiskCustomersSection({ customers, onViewDetails, isLoading, limit = 5 }) {
  // Filter to at-risk and critical customers (score < 60)
  const atRiskCustomers = customers
    ?.filter((c) => (c.health_score || 0) < 60)
    .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
    .slice(0, limit) || []

  if (isLoading) {
    return <AtRiskCustomersSkeleton />
  }

  if (atRiskCustomers.length === 0) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardContent className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
            <AlertCircle className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">No At-Risk Customers</h3>
          <p className="text-sm text-slate-500">
            All customers have health scores above 60. Great job!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            At-Risk Customers
            <Badge variant="danger" className="ml-1">
              {atRiskCustomers.length}
            </Badge>
          </CardTitle>
          <Link to="/health-scores?minScore=0&maxScore=60">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {atRiskCustomers.map((customer) => (
            <AtRiskCustomerRow
              key={customer.id}
              customer={customer}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AtRiskCustomerRow({ customer, onViewDetails }) {
  const score = customer.health_score || 0
  const isCritical = score < 40
  const trend = customer.score_trend || 'stable'
  const isDeclining = trend === 'declining' || trend === 'down'

  const daysUntilRenewal = customer.contract_end_date
    ? Math.ceil((new Date(customer.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const urgencyLevel = getUrgencyLevel(score, daysUntilRenewal, isDeclining, customer.contract_value)

  return (
    <div
      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
        isCritical ? 'border-l-4 border-l-danger' : 'border-l-4 border-l-warning'
      }`}
      onClick={() => onViewDetails(customer)}
    >
      <div className="flex items-start gap-4">
        {/* Score Gauge */}
        <div className="flex-shrink-0">
          <MiniScoreGauge score={score} size="sm" />
        </div>

        {/* Customer Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-slate-800 truncate">
              {customer.company_name}
            </h4>
            <Badge variant={isCritical ? 'danger' : 'warning'} className="text-[10px]">
              {isCritical ? 'Critical' : 'At Risk'}
            </Badge>
            {urgencyLevel === 'high' && (
              <Badge variant="danger" className="text-[10px] animate-pulse">
                Urgent
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            {customer.industry && (
              <span>{customer.industry}</span>
            )}
            {customer.account_manager_name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {customer.account_manager_name}
              </span>
            )}
          </div>

          {/* Risk Indicators */}
          <div className="flex items-center gap-3 mt-2">
            {/* Trend */}
            <div className="flex items-center gap-1">
              <CompactTrendIndicator trend={trend} change={customer.score_change} />
              {isDeclining && (
                <span className="text-xs text-danger">Declining</span>
              )}
            </div>

            {/* Renewal */}
            {daysUntilRenewal !== null && daysUntilRenewal <= 60 && (
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="w-3 h-3 text-warning" />
                <span className={daysUntilRenewal <= 30 ? 'text-danger font-medium' : 'text-warning'}>
                  {daysUntilRenewal > 0 ? `${daysUntilRenewal}d` : 'Overdue'}
                </span>
              </div>
            )}

            {/* Contract Value */}
            {customer.contract_value && customer.contract_value >= 50000 && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(customer.contract_value)}
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          <Link
            to={`/customers/${customer.id}?tab=health`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Risk Factors Summary */}
      {customer.score_factors && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">Lowest factors:</span>
            {getLowestFactors(customer.score_factors).map((factor) => (
              <span
                key={factor.key}
                className={`font-medium ${factor.value < 40 ? 'text-danger' : 'text-warning'}`}
              >
                {factor.label}: {factor.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getUrgencyLevel(score, daysUntilRenewal, isDeclining, contractValue) {
  let urgencyScore = 0

  // Critical score
  if (score < 40) urgencyScore += 3
  else if (score < 50) urgencyScore += 2
  else urgencyScore += 1

  // Upcoming renewal
  if (daysUntilRenewal !== null && daysUntilRenewal <= 30) urgencyScore += 2
  else if (daysUntilRenewal !== null && daysUntilRenewal <= 60) urgencyScore += 1

  // Declining trend
  if (isDeclining) urgencyScore += 1

  // High-value contract
  if (contractValue && contractValue >= 100000) urgencyScore += 1

  if (urgencyScore >= 5) return 'high'
  if (urgencyScore >= 3) return 'medium'
  return 'low'
}

function getLowestFactors(factors) {
  const factorLabels = {
    usage_score: 'Usage',
    engagement_score: 'Engagement',
    csat_score: 'CSAT',
    support_score: 'Support',
    adoption_score: 'Adoption',
  }

  return Object.entries(factors)
    .filter(([key]) => factorLabels[key])
    .map(([key, value]) => ({ key, label: factorLabels[key], value: value || 0 }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 2)
}

function AtRiskCustomersSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-slate-200 animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="flex gap-3">
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function AtRiskCustomersBanner({ count, totalAtRisk, onClick }) {
  if (count === 0) return null

  return (
    <div
      className="bg-gradient-to-r from-warning/10 to-danger/10 border border-warning/30 rounded-lg p-4 cursor-pointer hover:from-warning/20 hover:to-danger/20 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-warning/20">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">
              {count} Customer{count !== 1 ? 's' : ''} Need Attention
            </h4>
            <p className="text-sm text-slate-600">
              {totalAtRisk} total customers with health scores below 60
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-1 border-warning text-warning hover:bg-warning/10">
          View Details
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
