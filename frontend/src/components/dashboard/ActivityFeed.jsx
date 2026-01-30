import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  UserPlus,
  FileText,
  AlertTriangle,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  CheckCircle,
  Star,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const activityIcons = {
  // Backend activity types
  new_customer: { icon: UserPlus, color: 'text-success', bg: 'bg-success/10' },
  new_deployment: { icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  interaction: { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
  csat: { icon: Star, color: 'text-warning', bg: 'bg-warning/10' },
  alert: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  // Legacy types
  customer_created: { icon: UserPlus, color: 'text-success', bg: 'bg-success/10' },
  customer_updated: { icon: RefreshCw, color: 'text-primary', bg: 'bg-primary/10' },
  health_improved: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
  health_declined: { icon: TrendingDown, color: 'text-danger', bg: 'bg-danger/10' },
  alert_created: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  alert_resolved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  interaction_logged: { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
  meeting_scheduled: { icon: Calendar, color: 'text-accent', bg: 'bg-accent/10' },
  call_completed: { icon: Phone, color: 'text-secondary', bg: 'bg-secondary/10' },
  email_sent: { icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
  report_generated: { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-100' },
  csat_received: { icon: Star, color: 'text-warning', bg: 'bg-warning/10' },
  renewal_completed: { icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
}

const activityLabels = {
  // Backend activity types
  new_customer: 'New customer',
  new_deployment: 'New deployment',
  interaction: 'Interaction',
  csat: 'CSAT response',
  alert: 'Alert',
  // Legacy types
  customer_created: 'New customer added',
  customer_updated: 'Customer updated',
  health_improved: 'Health score improved',
  health_declined: 'Health score declined',
  alert_created: 'Alert triggered',
  alert_resolved: 'Alert resolved',
  interaction_logged: 'Interaction logged',
  meeting_scheduled: 'Meeting scheduled',
  call_completed: 'Call completed',
  email_sent: 'Email sent',
  report_generated: 'Report generated',
  csat_received: 'CSAT received',
  renewal_completed: 'Renewal completed',
}

export function ActivityFeed({ activities, isLoading }) {
  if (isLoading) {
    return <ActivityFeedSkeleton />
  }

  const recentActivities = activities?.slice(0, 10) || []

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <Link to="/interactions">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All
            <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {recentActivities.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-slate-200" />

            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const config = activityIcons[activity.activity_type] || {
                  icon: RefreshCw,
                  color: 'text-slate-500',
                  bg: 'bg-slate-100',
                }
                const Icon = config.icon

                return (
                  <div key={activity.id || index} className="relative flex gap-3">
                    {/* Icon */}
                    <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800">
                            <span className="font-medium">
                              {activity.title || activityLabels[activity.activity_type] || activity.activity_type}
                            </span>
                            {activity.customer_name && !activity.title?.includes(activity.customer_name) && (
                              <>
                                {' - '}
                                <Link
                                  to={`/customers/${activity.customer_id}`}
                                  className="text-primary hover:underline"
                                >
                                  {activity.customer_name}
                                </Link>
                              </>
                            )}
                          </p>
                          {activity.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {activity.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap">
                          {activity.timestamp && formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Additional info badges */}
                      {activity.metadata && (
                        <div className="flex items-center gap-2 mt-1.5">
                          {activity.metadata.score_change && (
                            <Badge
                              variant={activity.metadata.score_change > 0 ? 'success' : 'danger'}
                              className="text-xs"
                            >
                              {activity.metadata.score_change > 0 ? '+' : ''}{activity.metadata.score_change} pts
                            </Badge>
                          )}
                          {activity.metadata.severity && (
                            <Badge
                              variant={activity.metadata.severity === 'critical' ? 'danger' : 'warning'}
                              className="text-xs"
                            >
                              {activity.metadata.severity}
                            </Badge>
                          )}
                          {activity.performed_by && (
                            <span className="text-xs text-slate-400">
                              by {activity.performed_by}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="p-3 rounded-full bg-slate-100 mb-3">
              <RefreshCw className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No recent activity</p>
            <p className="text-xs text-slate-400">Activity will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ActivityFeedSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
