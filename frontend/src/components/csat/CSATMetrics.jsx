import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreTrendIndicator } from '@/components/health-scores'
import {
  Star,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  Percent,
} from 'lucide-react'

export function CSATMetrics({ data, isLoading }) {
  if (isLoading) {
    return <CSATMetricsSkeleton />
  }

  const avgCSAT = data?.avg_csat || 0
  const csatTrend = data?.csat_trend || 0
  const npsScore = data?.nps_score ?? 0
  const totalResponses = data?.total_responses || 0
  const lastMonthResponses = data?.last_month_responses || 0
  const responseRate = data?.response_rate || 0

  const npsTrend = data?.nps_trend || 0
  const promoters = data?.promoters_pct || 0
  const passives = data?.passives_pct || 0
  const detractors = data?.detractors_pct || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Average CSAT */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Average CSAT</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-800">
                  {avgCSAT.toFixed(1)}
                </span>
                <span className="text-slate-400">/5</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <ScoreTrendIndicator
                  trend={csatTrend > 0 ? 'improving' : csatTrend < 0 ? 'declining' : 'stable'}
                  change={csatTrend}
                  size="sm"
                />
                <span className="text-xs text-slate-500">vs last month</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-warning/10">
              <Star className="w-6 h-6 text-warning" />
            </div>
          </div>
          {/* Star Rating Visual */}
          <div className="mt-4 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(avgCSAT)
                    ? 'text-warning fill-warning'
                    : 'text-slate-200'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* NPS Score */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">NPS Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${
                  npsScore >= 50 ? 'text-success' :
                  npsScore >= 0 ? 'text-warning' : 'text-danger'
                }`}>
                  {npsScore > 0 ? '+' : ''}{npsScore}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <ScoreTrendIndicator
                  trend={npsTrend > 0 ? 'improving' : npsTrend < 0 ? 'declining' : 'stable'}
                  change={npsTrend}
                  size="sm"
                />
                <span className="text-xs text-slate-500">vs last month</span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${
              npsScore >= 50 ? 'bg-success/10' :
              npsScore >= 0 ? 'bg-warning/10' : 'bg-danger/10'
            }`}>
              <TrendingUp className={`w-6 h-6 ${
                npsScore >= 50 ? 'text-success' :
                npsScore >= 0 ? 'text-warning' : 'text-danger'
              }`} />
            </div>
          </div>
          {/* NPS Breakdown */}
          <div className="mt-4 flex items-center gap-3 text-xs">
            <span className="text-success">P: {promoters}%</span>
            <span className="text-warning">N: {passives}%</span>
            <span className="text-danger">D: {detractors}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Total Responses */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Responses</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-800">
                  {totalResponses}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {lastMonthResponses} last month
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">This month vs last</span>
              <span className={totalResponses >= lastMonthResponses ? 'text-success' : 'text-danger'}>
                {lastMonthResponses > 0
                  ? `${totalResponses >= lastMonthResponses ? '+' : ''}${Math.round(((totalResponses - lastMonthResponses) / lastMonthResponses) * 100)}%`
                  : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Rate */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Response Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-800">
                  {responseRate.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                of surveys completed
              </p>
            </div>
            <div className="p-3 rounded-xl bg-success/10">
              <Percent className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-500"
                style={{ width: `${Math.min(responseRate, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CSATMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
            </div>
            <div className="mt-4 h-4 w-full bg-slate-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
