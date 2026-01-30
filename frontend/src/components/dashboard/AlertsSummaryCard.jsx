import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  TrendingDown,
  UserMinus,
  DollarSign,
  Activity,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

export function AlertsSummaryCard({ alerts, isLoading }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const resolveMutation = useMutation({
    mutationFn: (alertId) => alertsAPI.resolve(alertId, user?.full_name || 'User'),
    onSuccess: () => {
      toast.success('Alert Resolved', 'The alert has been marked as resolved.')
      queryClient.invalidateQueries(['alerts'])
      queryClient.invalidateQueries(['alerts-dashboard'])
      queryClient.invalidateQueries(['dashboard-stats'])
    },
    onError: () => {
      toast.error('Error', 'Failed to resolve alert.')
    },
  })

  if (isLoading) {
    return <AlertsSummaryCardSkeleton />
  }

  const recentAlerts = alerts?.slice(0, 5) || []

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Recent Alerts</CardTitle>
        <Link to="/alerts">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All
            <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {recentAlerts.length > 0 ? (
          <div className="space-y-3">
            {recentAlerts.map((alert) => {
              const Icon = alertTypeIcons[alert.alert_type] || Bell
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    alert.severity === 'critical'
                      ? 'bg-danger/5 border border-danger/20'
                      : alert.severity === 'high'
                      ? 'bg-warning/5 border border-warning/20'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg ${
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
                      <Badge variant={severityColors[alert.severity]} className="text-xs px-1.5 py-0">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {alert.customer_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-success hover:bg-success/10"
                    onClick={() => resolveMutation.mutate(alert.id)}
                    disabled={resolveMutation.isPending}
                    title="Resolve alert"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="p-3 rounded-full bg-success/10 mb-3">
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm text-slate-500">No active alerts</p>
            <p className="text-xs text-slate-400">All caught up!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AlertsSummaryCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-7 h-7 bg-slate-200 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-1/4 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
