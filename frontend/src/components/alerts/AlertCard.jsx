import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTypeIcon, SeverityBadge, StatusBadge } from './AlertFilters'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import {
  CheckCircle,
  Clock,
  ExternalLink,
  MoreVertical,
  Eye,
  BellOff,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const severityColors = {
  critical: 'border-l-danger bg-danger/5',
  high: 'border-l-orange-500 bg-orange-500/5',
  medium: 'border-l-warning bg-warning/5',
  low: 'border-l-primary bg-primary/5',
}

const severityBorderColors = {
  critical: 'border-l-danger',
  high: 'border-l-orange-500',
  medium: 'border-l-warning',
  low: 'border-l-primary',
}

export function AlertCard({
  alert,
  onResolve,
  onSnooze,
  onViewDetails,
  onSelect,
  isSelected = false,
  showCheckbox = false,
}) {
  const isResolved = alert.is_resolved || alert.status === 'resolved'
  const isSnoozed = alert.is_snoozed || alert.status === 'snoozed'
  const severity = alert.severity || 'medium'
  const type = alert.alert_type || alert.type || 'health_drop'

  const getRelativeTime = () => {
    if (!alert.created_at) return 'Unknown time'
    try {
      return formatDistanceToNow(parseISO(alert.created_at), { addSuffix: true })
    } catch {
      return 'Unknown time'
    }
  }

  return (
    <Card
      className={`card-hover cursor-pointer border-l-4 transition-all ${
        isResolved
          ? 'border-l-slate-300 bg-slate-50 opacity-60'
          : isSnoozed
          ? 'border-l-slate-400 bg-slate-50'
          : severityBorderColors[severity]
      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onViewDetails?.(alert)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox for bulk selection */}
          {showCheckbox && (
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect?.(alert.id, checked)}
              />
            </div>
          )}

          {/* Alert Type Icon */}
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            isResolved ? 'bg-slate-200' : `bg-${severity === 'critical' ? 'danger' : severity === 'high' ? 'orange-500' : severity === 'medium' ? 'warning' : 'primary'}/10`
          }`}>
            <AlertTypeIcon
              type={type}
              className={`w-5 h-5 ${isResolved ? 'text-slate-400' : severity === 'critical' ? 'text-danger' : severity === 'high' ? 'text-orange-500' : severity === 'medium' ? 'text-warning' : 'text-primary'}`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={`font-semibold ${isResolved ? 'text-slate-500' : 'text-slate-800'}`}>
                {alert.title}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <SeverityBadge severity={severity} size="sm" />
                {isResolved && <StatusBadge status="resolved" />}
                {isSnoozed && <StatusBadge status="snoozed" />}
              </div>
            </div>

            {/* Description */}
            <p className={`text-sm mb-2 line-clamp-2 ${isResolved ? 'text-slate-400' : 'text-slate-600'}`}>
              {alert.description || alert.message}
            </p>

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-xs">
              {/* Customer */}
              {alert.customer_name && (
                <Link
                  to={`/customers/${alert.customer_id}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {alert.customer_name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              {/* Time */}
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getRelativeTime()}
              </span>
              {/* Snoozed Until */}
              {isSnoozed && alert.snoozed_until && (
                <span className="text-slate-500 flex items-center gap-1">
                  <BellOff className="w-3 h-3" />
                  Until {format(parseISO(alert.snoozed_until), 'MMM d')}
                </span>
              )}
            </div>

            {/* Resolution Info */}
            {isResolved && alert.resolved_at && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-400">
                Resolved {formatDistanceToNow(parseISO(alert.resolved_at), { addSuffix: true })}
                {alert.resolved_by_name && ` by ${alert.resolved_by_name}`}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isResolved && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onResolve?.(alert)}
                  title="Resolve"
                >
                  <CheckCircle className="w-4 h-4 text-success" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onSnooze?.(alert)}
                  title="Snooze"
                >
                  <BellOff className="w-4 h-4" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails?.(alert)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {alert.customer_id && (
                  <DropdownMenuItem asChild>
                    <Link to={`/customers/${alert.customer_id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Customer
                    </Link>
                  </DropdownMenuItem>
                )}
                {!isResolved && (
                  <>
                    <DropdownMenuItem onClick={() => onResolve?.(alert)}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Resolve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSnooze?.(alert)}>
                      <BellOff className="w-4 h-4 mr-2" />
                      Snooze
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AlertCardCompact({ alert, onResolve, onViewDetails }) {
  const isResolved = alert.is_resolved || alert.status === 'resolved'
  const severity = alert.severity || 'medium'
  const type = alert.alert_type || alert.type || 'health_drop'

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border border-l-4 cursor-pointer transition-colors hover:bg-slate-50 ${
        isResolved ? 'border-l-slate-300 opacity-60' : severityBorderColors[severity]
      }`}
      onClick={() => onViewDetails?.(alert)}
    >
      <AlertTypeIcon
        type={type}
        className={`w-4 h-4 flex-shrink-0 ${
          isResolved ? 'text-slate-400' :
          severity === 'critical' ? 'text-danger' :
          severity === 'high' ? 'text-orange-500' :
          severity === 'medium' ? 'text-warning' : 'text-primary'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isResolved ? 'text-slate-500' : 'text-slate-800'}`}>
          {alert.title}
        </p>
        <p className="text-xs text-slate-400">{alert.customer_name}</p>
      </div>
      {!isResolved && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onResolve?.(alert)
          }}
        >
          <CheckCircle className="w-4 h-4 text-success" />
        </Button>
      )}
    </div>
  )
}

export function AlertCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-full bg-slate-200 rounded animate-pulse mb-2" />
            <div className="flex items-center gap-4">
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-1">
            <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
            <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
