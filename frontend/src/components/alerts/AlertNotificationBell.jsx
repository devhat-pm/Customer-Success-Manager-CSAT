import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { alertsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AlertCardCompact } from './AlertCard'
import { SeverityBadge, AlertTypeIcon } from './AlertFilters'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Bell,
  BellRing,
  Check,
  ArrowRight,
  AlertTriangle,
  AlertOctagon,
  X,
} from 'lucide-react'

export function AlertNotificationBell({ onViewAlert }) {
  const [open, setOpen] = useState(false)
  const [hasNewAlerts, setHasNewAlerts] = useState(false)
  const [lastSeenCount, setLastSeenCount] = useState(0)

  // Fetch recent unresolved alerts
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts-notifications'],
    queryFn: () => alertsAPI.getAll({
      limit: 10,
      status: 'active',
      sort_by: 'created_at',
      sort_order: 'desc',
    }).then(res => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch alert stats for badge count
  const { data: statsData } = useQuery({
    queryKey: ['alert-stats-bell'],
    queryFn: () => alertsAPI.getStats().then(res => res.data),
    refetchInterval: 30000,
  })

  const alerts = alertsData?.alerts || []
  const totalActive = (statsData?.critical || 0) + (statsData?.high || 0) + (statsData?.medium || 0) + (statsData?.low || 0)
  const criticalCount = statsData?.critical || 0
  const highCount = statsData?.high || 0

  // Check for new alerts
  useEffect(() => {
    if (totalActive > lastSeenCount && lastSeenCount > 0) {
      setHasNewAlerts(true)
    }
  }, [totalActive, lastSeenCount])

  // Mark as seen when popover opens
  useEffect(() => {
    if (open) {
      setHasNewAlerts(false)
      setLastSeenCount(totalActive)
    }
  }, [open, totalActive])

  const handleViewAlert = (alert) => {
    setOpen(false)
    onViewAlert?.(alert)
  }

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${hasNewAlerts ? 'animate-pulse' : ''}`}
        >
          {hasNewAlerts || criticalCount > 0 ? (
            <BellRing className={`w-5 h-5 ${criticalCount > 0 ? 'text-danger' : 'text-warning'}`} />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {totalActive > 0 && (
            <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
              criticalCount > 0 ? 'bg-danger' : highCount > 0 ? 'bg-orange-500' : 'bg-primary'
            }`}>
              {totalActive > 99 ? '99+' : totalActive}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h4 className="font-semibold text-slate-800">Alerts</h4>
            <p className="text-xs text-slate-500">{totalActive} active alerts</p>
          </div>
          {criticalCount > 0 && (
            <Badge variant="danger" className="animate-pulse gap-1">
              <AlertOctagon className="w-3 h-3" />
              {criticalCount} critical
            </Badge>
          )}
        </div>

        {/* Quick Stats */}
        {totalActive > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b text-xs">
            {criticalCount > 0 && (
              <span className="text-danger font-medium">{criticalCount} Critical</span>
            )}
            {highCount > 0 && (
              <span className="text-orange-500 font-medium">{highCount} High</span>
            )}
            {statsData?.medium > 0 && (
              <span className="text-warning font-medium">{statsData.medium} Medium</span>
            )}
            {statsData?.low > 0 && (
              <span className="text-primary font-medium">{statsData.low} Low</span>
            )}
          </div>
        )}

        {/* Alerts List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-1" />
                    <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No active alerts</p>
              <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <AlertNotificationItem
                  key={alert.id}
                  alert={alert}
                  onClick={() => handleViewAlert(alert)}
                  getRelativeTime={getRelativeTime}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {totalActive > 0 && (
          <div className="p-3 border-t bg-slate-50">
            <Link to="/alerts" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full gap-2">
                View All Alerts
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function AlertNotificationItem({ alert, onClick, getRelativeTime }) {
  const severity = alert.severity || 'medium'
  const type = alert.alert_type || alert.type || 'health_drop'

  const severityBorderColors = {
    critical: 'border-l-danger',
    high: 'border-l-orange-500',
    medium: 'border-l-warning',
    low: 'border-l-primary',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 hover:bg-slate-50 transition-colors border-l-4 ${severityBorderColors[severity]}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg flex-shrink-0 ${
          severity === 'critical' ? 'bg-danger/10' :
          severity === 'high' ? 'bg-orange-500/10' :
          severity === 'medium' ? 'bg-warning/10' : 'bg-primary/10'
        }`}>
          <AlertTypeIcon
            type={type}
            className={`w-4 h-4 ${
              severity === 'critical' ? 'text-danger' :
              severity === 'high' ? 'text-orange-500' :
              severity === 'medium' ? 'text-warning' : 'text-primary'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm text-slate-800 truncate">{alert.title}</p>
            <SeverityBadge severity={severity} size="sm" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {alert.customer_name && (
              <span className="text-xs text-slate-500 truncate">{alert.customer_name}</span>
            )}
            <span className="text-xs text-slate-400">{getRelativeTime(alert.created_at)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// Compact version for use in headers/navigation
export function AlertBellCompact({ count, criticalCount, onClick }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      {criticalCount > 0 ? (
        <BellRing className="w-5 h-5 text-danger animate-pulse" />
      ) : count > 0 ? (
        <BellRing className="w-5 h-5" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
      {count > 0 && (
        <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
          criticalCount > 0 ? 'bg-danger' : 'bg-primary'
        }`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  )
}
