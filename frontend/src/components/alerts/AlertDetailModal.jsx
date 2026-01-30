import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersAPI } from '@/services/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTypeIcon, SeverityBadge, StatusBadge } from './AlertFilters'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import {
  CheckCircle,
  Clock,
  ExternalLink,
  BellOff,
  User,
  Building,
  TrendingDown,
  Calendar,
  Mail,
  Phone,
  DollarSign,
  Activity,
  X,
} from 'lucide-react'

export function AlertDetailModal({ open, onClose, alert, onResolve, onSnooze }) {
  if (!alert) return null

  const isResolved = alert.is_resolved || alert.status === 'resolved'
  const isSnoozed = alert.is_snoozed || alert.status === 'snoozed'
  const severity = alert.severity || 'medium'
  const type = alert.alert_type || alert.type || 'health_drop'

  // Fetch customer details if we have a customer_id
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', alert.customer_id],
    queryFn: () => customersAPI.getById(alert.customer_id).then(res => res.data),
    enabled: !!alert.customer_id,
  })

  const customer = customerData

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Unknown'
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
    } catch {
      return 'Unknown'
    }
  }

  const severityColors = {
    critical: 'border-t-danger',
    high: 'border-t-orange-500',
    medium: 'border-t-warning',
    low: 'border-t-primary',
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                severity === 'critical' ? 'bg-danger/10' :
                severity === 'high' ? 'bg-orange-500/10' :
                severity === 'medium' ? 'bg-warning/10' : 'bg-primary/10'
              }`}>
                <AlertTypeIcon
                  type={type}
                  className={`w-6 h-6 ${
                    severity === 'critical' ? 'text-danger' :
                    severity === 'high' ? 'text-orange-500' :
                    severity === 'medium' ? 'text-warning' : 'text-primary'
                  }`}
                />
              </div>
              <div>
                <DialogTitle className="text-xl">{alert.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <SeverityBadge severity={severity} />
                  {isResolved && <StatusBadge status="resolved" />}
                  {isSnoozed && <StatusBadge status="snoozed" />}
                  {!isResolved && !isSnoozed && <StatusBadge status="active" />}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Alert Details */}
          <Card className={`border-t-4 ${severityColors[severity]}`}>
            <CardContent className="p-4">
              <h4 className="font-medium text-slate-700 mb-2">Description</h4>
              <p className="text-slate-600">{alert.description || alert.message || 'No description available'}</p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getFormattedDate(alert.created_at)}
                  </p>
                  <p className="text-xs text-slate-400">{getRelativeTime(alert.created_at)}</p>
                </div>
                {alert.triggered_value && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Triggered Value</p>
                    <p className="text-sm font-medium text-slate-700">{alert.triggered_value}</p>
                    {alert.threshold && (
                      <p className="text-xs text-slate-400">Threshold: {alert.threshold}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Resolution Info */}
              {isResolved && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-success mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Resolved</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Resolved At</p>
                      <p className="text-sm text-slate-600">{getFormattedDate(alert.resolved_at)}</p>
                    </div>
                    {alert.resolved_by_name && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Resolved By</p>
                        <p className="text-sm text-slate-600">{alert.resolved_by_name}</p>
                      </div>
                    )}
                  </div>
                  {alert.resolution_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400 mb-1">Resolution Notes</p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{alert.resolution_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Snoozed Info */}
              {isSnoozed && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <BellOff className="w-4 h-4" />
                    <span className="font-medium">Snoozed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Snoozed Until</p>
                      <p className="text-sm text-slate-600">{getFormattedDate(alert.snoozed_until)}</p>
                    </div>
                    {alert.snoozed_by_name && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Snoozed By</p>
                        <p className="text-sm text-slate-600">{alert.snoozed_by_name}</p>
                      </div>
                    )}
                  </div>
                  {alert.snooze_reason && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400 mb-1">Snooze Reason</p>
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{alert.snooze_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Summary Card */}
          {alert.customer_id && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {customerLoading ? (
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                  </div>
                ) : customer ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="font-semibold text-slate-800 hover:text-primary flex items-center gap-1"
                        >
                          {customer.company_name}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        {customer.industry && (
                          <p className="text-sm text-slate-500">{customer.industry}</p>
                        )}
                      </div>
                      {customer.health_score !== undefined && (
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Health Score</p>
                          <div className="flex items-center gap-1">
                            <Activity className={`w-4 h-4 ${
                              customer.health_score >= 70 ? 'text-success' :
                              customer.health_score >= 40 ? 'text-warning' : 'text-danger'
                            }`} />
                            <span className={`font-bold ${
                              customer.health_score >= 70 ? 'text-success' :
                              customer.health_score >= 40 ? 'text-warning' : 'text-danger'
                            }`}>
                              {customer.health_score}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      {customer.mrr && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">${customer.mrr.toLocaleString()} MRR</span>
                        </div>
                      )}
                      {customer.contract_end_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">
                            Renews {format(parseISO(customer.contract_end_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      {customer.primary_contact_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{customer.primary_contact_name}</span>
                        </div>
                      )}
                      {customer.primary_contact_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <a
                            href={`mailto:${customer.primary_contact_email}`}
                            className="text-primary hover:underline"
                          >
                            {customer.primary_contact_email}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <Link to={`/customers/${customer.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Customer Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Customer: {alert.customer_name || 'Unknown'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related Information */}
          {(alert.related_alerts?.length > 0 || alert.related_interactions?.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Related Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {alert.related_alerts?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-2">Related Alerts ({alert.related_alerts.length})</p>
                    <div className="space-y-2">
                      {alert.related_alerts.slice(0, 3).map((related) => (
                        <div key={related.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                          <span className="text-slate-700">{related.title}</span>
                          <SeverityBadge severity={related.severity} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {alert.related_interactions?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Recent Interactions ({alert.related_interactions.length})</p>
                    <div className="space-y-2">
                      {alert.related_interactions.slice(0, 3).map((interaction) => (
                        <div key={interaction.id} className="text-sm p-2 bg-slate-50 rounded">
                          <span className="text-slate-700">{interaction.summary}</span>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(parseISO(interaction.interaction_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {!isResolved && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={() => onResolve?.(alert)} className="flex-1 gap-2">
                <CheckCircle className="w-4 h-4" />
                Resolve Alert
              </Button>
              <Button variant="outline" onClick={() => onSnooze?.(alert)} className="flex-1 gap-2">
                <BellOff className="w-4 h-4" />
                Snooze
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
