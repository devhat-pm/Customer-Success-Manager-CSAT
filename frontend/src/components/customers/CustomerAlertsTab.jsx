import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  UserMinus,
  Activity,
  DollarSign,
  Filter,
  CheckCircle,
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

export function CustomerAlertsTab({ customer }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('unresolved')
  const [severityFilter, setSeverityFilter] = useState('all')
  const limit = 10
  const customerId = customer?.id

  // Fetch alerts
  const { data, isLoading } = useQuery({
    queryKey: ['customer-alerts-list', customerId, page, statusFilter, severityFilter],
    queryFn: () =>
      alertsAPI.getByCustomer(customerId, {
        skip: (page - 1) * limit,
        limit,
        is_resolved: statusFilter === 'resolved' ? true : statusFilter === 'unresolved' ? false : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
      }).then(res => res.data),
    enabled: !!customerId,
  })

  const alerts = data?.alerts || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: (alertId) => alertsAPI.resolve(alertId, user?.full_name || 'User'),
    onSuccess: () => {
      toast.success('Alert Resolved', 'The alert has been marked as resolved.')
      queryClient.invalidateQueries(['customer-alerts-list', customer.id])
      queryClient.invalidateQueries(['customer-alerts', customer.id])
    },
    onError: () => {
      toast.error('Error', 'Failed to resolve alert.')
    },
  })

  if (isLoading && page === 1) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Alerts</CardTitle>
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {/* Severity Filter */}
          <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1) }}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <>
            <div className="space-y-3">
              {alerts.map((alert) => {
                const Icon = alertTypeIcons[alert.alert_type] || Bell

                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      alert.is_resolved
                        ? 'bg-slate-50 border-slate-100'
                        : alert.severity === 'critical'
                        ? 'bg-danger/5 border-danger/20'
                        : alert.severity === 'high'
                        ? 'bg-warning/5 border-warning/20'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        alert.is_resolved
                          ? 'bg-slate-100'
                          : alert.severity === 'critical'
                          ? 'bg-danger/10'
                          : alert.severity === 'high'
                          ? 'bg-warning/10'
                          : 'bg-slate-100'
                      }`}
                    >
                      {alert.is_resolved ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Icon
                          className={`w-5 h-5 ${
                            alert.severity === 'critical'
                              ? 'text-danger'
                              : alert.severity === 'high'
                              ? 'text-warning'
                              : 'text-slate-500'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${alert.is_resolved ? 'text-slate-500' : 'text-slate-800'}`}>
                          {alert.title}
                        </span>
                        <Badge variant={severityColors[alert.severity]}>
                          {alert.severity}
                        </Badge>
                        {alert.is_resolved && (
                          <Badge variant="success">Resolved</Badge>
                        )}
                      </div>
                      <p className={`text-sm line-clamp-2 ${alert.is_resolved ? 'text-slate-400' : 'text-slate-600'}`}>
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="capitalize">{alert.alert_type?.replace('_', ' ')}</span>
                        <span>
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                        {alert.is_resolved && alert.resolved_by && (
                          <span>Resolved by {alert.resolved_by}</span>
                        )}
                      </div>
                    </div>
                    {!alert.is_resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        className="gap-1 flex-shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        Resolve
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="p-3 rounded-full bg-success/10 mb-3">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <p className="text-slate-500">
              {statusFilter === 'unresolved' ? 'No unresolved alerts' : 'No alerts found'}
            </p>
            <p className="text-sm text-slate-400">
              {statusFilter === 'unresolved' ? 'All caught up!' : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
