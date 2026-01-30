import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { customersAPI, alertsAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthScoreGauge } from './HealthScoreCard'
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  TrendingDown,
  UserMinus,
  Activity,
  DollarSign,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  Video,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const activityIcons = {
  interaction: MessageSquare,
  meeting: Video,
  call: Phone,
  email: Mail,
  alert: AlertTriangle,
  health_change: Activity,
  deployment: Calendar,
}

const alertTypeIcons = {
  health_drop: TrendingDown,
  churn_risk: UserMinus,
  low_engagement: Activity,
  payment_issue: DollarSign,
  support_escalation: AlertTriangle,
}

const severityColors = {
  critical: 'danger',
  high: 'warning',
  medium: 'secondary',
  low: 'secondary',
}

export function CustomerOverviewTab({ customer }) {
  const customerId = customer?.id

  // Fetch health score details
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['customer-health', customerId],
    queryFn: () => customersAPI.getHealthHistory(customerId, { limit: 1 }).then(res => res.data),
    enabled: !!customerId,
  })

  // Fetch customer timeline
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['customer-timeline', customerId],
    queryFn: () => customersAPI.getTimeline(customerId, { limit: 10 }).then(res => res.data),
    enabled: !!customerId,
  })

  // Fetch active alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['customer-alerts', customerId],
    queryFn: () => alertsAPI.getByCustomer(customerId, { is_resolved: false, limit: 5 }).then(res => res.data),
    enabled: !!customerId,
  })

  const latestHealth = healthData?.health_scores?.[0] || healthData?.history?.[0]
  const timeline = timelineData?.items || timelineData?.activities || []
  const alerts = alertsData?.alerts || []

  return (
    <div className="space-y-6">
      {/* Health Score Breakdown */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Health Score Breakdown</CardTitle>
          <Link to={`/customers/${customer.id}?tab=health`}>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View History
              <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex justify-around py-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-slate-200 animate-pulse mb-2" />
                  <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : latestHealth ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4">
              <HealthScoreGauge
                label="Engagement"
                score={latestHealth.engagement_score || 0}
                weight={25}
                size="md"
              />
              <HealthScoreGauge
                label="Adoption"
                score={latestHealth.adoption_score || 0}
                weight={25}
                size="md"
              />
              <HealthScoreGauge
                label="Support"
                score={latestHealth.support_score || 0}
                weight={25}
                size="md"
              />
              <HealthScoreGauge
                label="Financial"
                score={latestHealth.financial_score || 0}
                weight={25}
                size="md"
              />
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No health score data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Activity</CardTitle>
            <Link to={`/customers/${customer.id}?tab=interactions`}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All
                <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-1" />
                      <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timeline.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />
                <div className="space-y-4">
                  {timeline.map((activity, index) => {
                    const Icon = activityIcons[activity.type] || activityIcons[activity.activity_type] || Activity
                    return (
                      <div key={activity.id || index} className="relative flex gap-3">
                        <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-slate-800">{activity.title}</p>
                          {activity.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {activity.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(activity.date || activity.timestamp || activity.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Active Alerts</CardTitle>
            <Link to={`/customers/${customer.id}?tab=alerts`}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All
                <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-1" />
                      <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const Icon = alertTypeIcons[alert.alert_type] || Bell
                  return (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        alert.severity === 'critical'
                          ? 'bg-danger/5 border-danger/20'
                          : alert.severity === 'high'
                          ? 'bg-warning/5 border-warning/20'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          alert.severity === 'critical'
                            ? 'bg-danger/10'
                            : alert.severity === 'high'
                            ? 'bg-warning/10'
                            : 'bg-slate-100'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            alert.severity === 'critical'
                              ? 'text-danger'
                              : alert.severity === 'high'
                              ? 'text-warning'
                              : 'text-slate-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm text-slate-800 truncate">
                            {alert.title}
                          </span>
                          <Badge variant={severityColors[alert.severity]} className="text-xs">
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {alert.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="p-3 rounded-full bg-success/10 mb-3">
                  <Check className="w-6 h-6 text-success" />
                </div>
                <p className="text-sm text-slate-500">No active alerts</p>
                <p className="text-xs text-slate-400">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
