import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

const severityConfig = {
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    color: 'text-danger',
    bg: 'bg-danger/10',
    border: 'border-l-danger',
    accent: 'danger',
  },
  high: {
    label: 'High Priority',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-l-orange-500',
    accent: 'warning',
  },
  medium: {
    label: 'Medium Priority',
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-l-warning',
    accent: 'warning',
  },
  low: {
    label: 'Low Priority',
    icon: Info,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-l-primary',
    accent: 'primary',
  },
}

export function AlertStatsCards({ stats, isLoading, onFilterBySeverity }) {
  if (isLoading) {
    return <AlertStatsCardsSkeleton />
  }

  const severities = ['critical', 'high', 'medium', 'low']

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {severities.map((severity) => {
        const config = severityConfig[severity]
        const Icon = config.icon
        const count = stats?.[severity] || 0
        const previousCount = stats?.[`${severity}_previous`] || 0
        const trend = previousCount > 0 ? count - previousCount : 0

        return (
          <Card
            key={severity}
            className={`card-hover cursor-pointer border-l-4 ${config.border}`}
            onClick={() => onFilterBySeverity?.(severity)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    {config.label}
                  </p>
                  <p className={`text-3xl font-bold ${count > 0 ? config.color : 'text-slate-300'}`}>
                    {count}
                  </p>
                  {trend !== 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {trend > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-danger" />
                          <span className="text-xs text-danger">+{trend} from last week</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3 text-success" />
                          <span className="text-xs text-success">{trend} from last week</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${config.bg}`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
              </div>
              {count > 0 && severity === 'critical' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Badge variant="danger" className="animate-pulse">
                    Requires immediate attention
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function AlertStatsSummary({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  const total = (stats?.critical || 0) + (stats?.high || 0) + (stats?.medium || 0) + (stats?.low || 0)

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-slate-500">{total} active alerts:</span>
      {stats?.critical > 0 && (
        <Badge variant="danger">{stats.critical} Critical</Badge>
      )}
      {stats?.high > 0 && (
        <Badge variant="warning">{stats.high} High</Badge>
      )}
      {stats?.medium > 0 && (
        <Badge variant="secondary">{stats.medium} Medium</Badge>
      )}
      {stats?.low > 0 && (
        <Badge variant="primary">{stats.low} Low</Badge>
      )}
    </div>
  )
}

function AlertStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-12 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
