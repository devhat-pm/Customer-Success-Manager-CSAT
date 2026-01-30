import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { interactionsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InteractionTypeIcon } from './InteractionFilters'
import { format, parseISO, isPast, differenceInDays, isToday, isTomorrow } from 'date-fns'
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronRight,
  User,
  ExternalLink,
} from 'lucide-react'

export function PendingFollowups({ interactions, isLoading, limit = 5, onViewInteraction }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Pending follow-ups (already filtered by API) - just sort and limit
  const pendingFollowups = (interactions || [])
    .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date))
    .slice(0, limit)

  const overdueCount = pendingFollowups.filter((i) => i.is_overdue || (i.follow_up_date && isPast(parseISO(i.follow_up_date)))).length

  // Complete follow-up mutation
  const completeMutation = useMutation({
    mutationFn: (id) => interactionsAPI.update(id, { follow_up_required: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] })
      toast.success('Follow-up Completed', 'The follow-up has been marked as complete.')
    },
    onError: () => {
      toast.error('Error', 'Failed to complete follow-up.')
    },
  })

  if (isLoading) {
    return <PendingFollowupsSkeleton />
  }

  if (pendingFollowups.length === 0) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardContent className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">All Caught Up!</h3>
          <p className="text-sm text-slate-500">
            No pending follow-ups at the moment.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={overdueCount > 0 ? 'border-danger/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            Pending Follow-ups
            <Badge variant={overdueCount > 0 ? 'danger' : 'warning'}>
              {pendingFollowups.length}
            </Badge>
          </CardTitle>
          {overdueCount > 0 && (
            <Badge variant="danger" className="animate-pulse">
              {overdueCount} overdue
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {pendingFollowups.map((interaction) => (
            <FollowupItem
              key={interaction.interaction_id || interaction.id}
              interaction={interaction}
              onComplete={() => completeMutation.mutate(interaction.interaction_id || interaction.id)}
              onView={() => onViewInteraction?.(interaction)}
              isCompleting={completeMutation.isPending}
            />
          ))}
        </div>
        {pendingFollowups.length >= limit && (
          <div className="p-3 border-t border-slate-100 text-center">
            <Link to="/interactions?followupRequired=true">
              <Button variant="ghost" size="sm" className="gap-1">
                View All Follow-ups
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FollowupItem({ interaction, onComplete, onView, isCompleting }) {
  const followupDate = parseISO(interaction.follow_up_date)
  const isOverdue = isPast(followupDate)
  const daysUntil = differenceInDays(followupDate, new Date())

  const getUrgencyLabel = () => {
    if (isOverdue) {
      const daysOverdue = Math.abs(daysUntil)
      return `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`
    }
    if (isToday(followupDate)) return 'Today'
    if (isTomorrow(followupDate)) return 'Tomorrow'
    return `In ${daysUntil} days`
  }

  return (
    <div
      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
        isOverdue ? 'border-l-4 border-l-danger bg-danger/5' : ''
      }`}
      onClick={onView}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className={`p-2 rounded-lg ${isOverdue ? 'bg-danger/10' : 'bg-slate-100'}`}>
          <InteractionTypeIcon
            type={interaction.interaction_type}
            className={`w-4 h-4 ${isOverdue ? 'text-danger' : 'text-slate-500'}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-slate-800 truncate">
              {interaction.subject}
            </h4>
            {isOverdue && (
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Link
              to={`/customers/${interaction.customer_id}`}
              className="flex items-center gap-1 text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {interaction.customer_name}
              <ExternalLink className="w-3 h-3" />
            </Link>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {interaction.performed_by_name || interaction.performed_by || 'Unknown'}
            </span>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2 mt-2">
            <Calendar className={`w-3 h-3 ${isOverdue ? 'text-danger' : 'text-slate-400'}`} />
            <span className={`text-xs font-medium ${isOverdue ? 'text-danger' : 'text-slate-600'}`}>
              {getUrgencyLabel()}
            </span>
            <span className="text-xs text-slate-400">
              ({format(followupDate, 'MMM d')})
            </span>
          </div>
        </div>

        {/* Complete Button */}
        <Button
          variant={isOverdue ? 'danger' : 'outline'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onComplete()
          }}
          disabled={isCompleting}
          className="flex-shrink-0"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Complete
        </Button>
      </div>
    </div>
  )
}

export function PendingFollowupsBanner({ count, overdueCount, onClick }) {
  if (count === 0) return null

  return (
    <div
      className={`rounded-lg p-4 cursor-pointer transition-colors ${
        overdueCount > 0
          ? 'bg-gradient-to-r from-danger/10 to-warning/10 border border-danger/30 hover:from-danger/20 hover:to-warning/20'
          : 'bg-warning/10 border border-warning/30 hover:bg-warning/20'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${overdueCount > 0 ? 'bg-danger/20' : 'bg-warning/20'}`}>
            {overdueCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-danger" />
            ) : (
              <Clock className="w-5 h-5 text-warning" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">
              {count} Pending Follow-up{count !== 1 ? 's' : ''}
            </h4>
            {overdueCount > 0 && (
              <p className="text-sm text-danger">
                {overdueCount} overdue - requires immediate attention
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" className="gap-1">
          View All
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function PendingFollowupsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-8 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="w-20 h-8 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
