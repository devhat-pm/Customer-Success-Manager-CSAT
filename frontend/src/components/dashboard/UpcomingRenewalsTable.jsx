import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Calendar, DollarSign, AlertTriangle } from 'lucide-react'
import { formatCurrency, getHealthStatusColor, getHealthStatusLabel } from '@/lib/utils'

export function UpcomingRenewalsTable({ data, isLoading }) {
  if (isLoading) {
    return <UpcomingRenewalsTableSkeleton />
  }

  // Backend returns { renewals_30_days, renewals_60_days, renewals_90_days }
  // Combine and dedupe (90 days includes 60 which includes 30)
  const renewals = data?.renewals_90_days?.map(r => ({
    ...r,
    renewal_date: r.contract_end_date,
    customer_name: r.company_name,
  })) || []

  const getUrgencyColor = (daysUntil) => {
    if (daysUntil <= 7) return 'danger'
    if (daysUntil <= 30) return 'warning'
    if (daysUntil <= 60) return 'secondary'
    return 'success'
  }

  const getUrgencyLabel = (daysUntil) => {
    if (daysUntil <= 0) return 'Overdue'
    if (daysUntil <= 7) return 'Urgent'
    if (daysUntil <= 30) return 'Soon'
    return `${daysUntil}d`
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Upcoming Renewals</CardTitle>
          <CardDescription>Next 90 days</CardDescription>
        </div>
        <Link to="/customers?renewal_period=90">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All
            <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {renewals.length > 0 ? (
          <div className="space-y-2">
            {renewals.slice(0, 6).map((renewal) => {
              const daysUntil = renewal.days_until_renewal ?? Math.ceil(
                (new Date(renewal.renewal_date) - new Date()) / (1000 * 60 * 60 * 24)
              )
              return (
                <Link
                  key={renewal.customer_id}
                  to={`/customers/${renewal.customer_id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-slate-800 truncate group-hover:text-primary transition-colors">
                        {renewal.customer_name}
                      </span>
                      {daysUntil <= 30 && renewal.health_score < 60 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(renewal.contract_value)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(renewal.renewal_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getHealthStatusColor(renewal.health_score)} className="text-xs">
                      {renewal.health_score}
                    </Badge>
                    <Badge variant={getUrgencyColor(daysUntil)} className="text-xs min-w-12 justify-center">
                      {getUrgencyLabel(daysUntil)}
                    </Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="p-3 rounded-full bg-slate-100 mb-3">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No upcoming renewals</p>
            <p className="text-xs text-slate-400">in the next 90 days</p>
          </div>
        )}
      </CardContent>

      {/* Summary footer */}
      {renewals.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Total value at risk
            </span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(
                renewals
                  .filter(r => {
                    const days = Math.ceil((new Date(r.renewal_date) - new Date()) / (1000 * 60 * 60 * 24))
                    return days <= 30 && r.health_score < 60
                  })
                  .reduce((sum, r) => sum + r.contract_value, 0)
              )}
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}

export function UpcomingRenewalsTableSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mt-1" />
        </div>
        <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-10 bg-slate-200 rounded animate-pulse" />
                <div className="h-5 w-12 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
