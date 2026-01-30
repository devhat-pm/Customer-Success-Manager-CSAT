import { Card, CardContent } from '@/components/ui/card'
import { ScoreGauge } from './ScoreGauge'
import { HeartPulse, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export function HealthScoreOverviewCards({ stats, isLoading }) {
  if (isLoading) {
    return <HealthScoreOverviewCardsSkeleton />
  }

  const avgScore = Math.round(stats?.avg_score || 0)
  const totalCustomers = stats?.total_customers || 0

  const excellent = stats?.by_status?.excellent || { count: 0, percentage: 0 }
  const good = stats?.by_status?.good || { count: 0, percentage: 0 }
  const atRisk = stats?.by_status?.at_risk || { count: 0, percentage: 0 }
  const critical = stats?.by_status?.critical || { count: 0, percentage: 0 }

  const healthyCount = excellent.count + good.count
  const healthyPct = totalCustomers > 0 ? ((healthyCount / totalCustomers) * 100).toFixed(0) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Average Score */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-slate-800">{avgScore}</p>
              <p className="text-xs text-slate-400 mt-1">
                out of 100
              </p>
            </div>
            <ScoreGauge score={avgScore} size="lg" showLabel={false} />
          </div>
        </CardContent>
      </Card>

      {/* Healthy Customers */}
      <Card className="card-hover border-l-4 border-l-success">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Healthy</p>
              <p className="text-3xl font-bold text-success">{healthyCount}</p>
              <p className="text-xs text-slate-400 mt-1">
                {healthyPct}% of customers
              </p>
            </div>
            <div className="p-3 rounded-xl bg-success/10">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span>Excellent: {excellent.count}</span>
            <span>Good: {good.count}</span>
          </div>
        </CardContent>
      </Card>

      {/* At Risk Customers */}
      <Card className="card-hover border-l-4 border-l-warning">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">At Risk</p>
              <p className="text-3xl font-bold text-warning">{atRisk.count}</p>
              <p className="text-xs text-slate-400 mt-1">
                {atRisk.percentage?.toFixed(0) || 0}% of customers
              </p>
            </div>
            <div className="p-3 rounded-xl bg-warning/10">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-warning transition-all duration-500"
                style={{ width: `${atRisk.percentage || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Customers */}
      <Card className="card-hover border-l-4 border-l-danger">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Critical</p>
              <p className="text-3xl font-bold text-danger">{critical.count}</p>
              <p className="text-xs text-slate-400 mt-1">
                {critical.percentage?.toFixed(0) || 0}% of customers
              </p>
            </div>
            <div className="p-3 rounded-xl bg-danger/10">
              <XCircle className="w-6 h-6 text-danger" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-danger transition-all duration-500"
                style={{ width: `${critical.percentage || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HealthScoreOverviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
