import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InteractionTypeIcon, SentimentBadge } from './InteractionFilters'
import { format, parseISO, isToday, isYesterday, isPast, differenceInDays } from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertTriangle,
  User,
  Clock,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'

const typeColors = {
  support: { bg: 'bg-primary', border: 'border-primary' },
  meeting: { bg: 'bg-secondary', border: 'border-secondary' },
  email: { bg: 'bg-accent', border: 'border-accent' },
  call: { bg: 'bg-success', border: 'border-success' },
  escalation: { bg: 'bg-danger', border: 'border-danger' },
  training: { bg: 'bg-warning', border: 'border-warning' },
}

const sentimentColors = {
  positive: 'border-l-success',
  neutral: 'border-l-slate-300',
  negative: 'border-l-danger',
}

export function InteractionsTimeline({ interactions, onViewInteraction, isLoading }) {
  const [expandedIds, setExpandedIds] = useState(new Set())

  if (isLoading) {
    return <InteractionsTimelineSkeleton />
  }

  if (!interactions || interactions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">No interactions found</p>
      </div>
    )
  }

  // Group interactions by date
  const groupedInteractions = interactions.reduce((groups, interaction) => {
    const date = interaction.interaction_date
      ? format(parseISO(interaction.interaction_date), 'yyyy-MM-dd')
      : 'unknown'
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(interaction)
    return groups
  }, {})

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const getDateLabel = (dateStr) => {
    if (dateStr === 'unknown') return 'Unknown Date'
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedInteractions).map(([date, dayInteractions]) => (
        <div key={date}>
          {/* Date Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                {getDateLabel(date)}
              </span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <Badge variant="secondary" className="text-xs">
              {dayInteractions.length} interaction{dayInteractions.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Timeline Items */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />

            <div className="space-y-4">
              {dayInteractions.map((interaction, idx) => {
                const colors = typeColors[interaction.interaction_type] || typeColors.support
                const isExpanded = expandedIds.has(interaction.id)
                const hasFollowup = interaction.follow_up_required && interaction.follow_up_date
                const isOverdue = hasFollowup && isPast(parseISO(interaction.follow_up_date))

                return (
                  <div key={interaction.id} className="relative flex gap-4">
                    {/* Timeline Dot */}
                    <div className={`relative z-10 w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <InteractionTypeIcon
                        type={interaction.interaction_type}
                        className="w-5 h-5 text-white"
                      />
                    </div>

                    {/* Content Card */}
                    <Card className={`flex-1 border-l-4 ${sentimentColors[interaction.sentiment] || sentimentColors.neutral}`}>
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-slate-800">
                                {interaction.subject || 'No subject'}
                              </h4>
                              <SentimentBadge sentiment={interaction.sentiment} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {interaction.interaction_date
                                  ? format(parseISO(interaction.interaction_date), 'h:mm a')
                                  : '-'}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {interaction.performed_by_name || interaction.performed_by || 'Unknown'}
                              </span>
                              <Link
                                to={`/customers/${interaction.customer_id}`}
                                className="flex items-center gap-1 text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {interaction.customer_name}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(interaction.id)}
                            className="h-8"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Follow-up Warning */}
                        {isOverdue && (
                          <div className="flex items-center gap-2 p-2 bg-danger/10 rounded-lg mb-2 text-sm text-danger">
                            <AlertTriangle className="w-4 h-4" />
                            <span>
                              Follow-up overdue ({differenceInDays(new Date(), parseISO(interaction.follow_up_date))} days)
                            </span>
                          </div>
                        )}

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                            {interaction.description && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Description</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                  {interaction.description}
                                </p>
                              </div>
                            )}

                            {hasFollowup && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className={`w-4 h-4 ${isOverdue ? 'text-danger' : 'text-slate-400'}`} />
                                <span className={isOverdue ? 'text-danger' : 'text-slate-600'}>
                                  Follow-up: {format(parseISO(interaction.follow_up_date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}

                            {interaction.notes && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Notes</p>
                                <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                  {interaction.notes}
                                </p>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewInteraction(interaction)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function InteractionsTimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((group) => (
        <div key={group}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-40 bg-slate-200 rounded-full animate-pulse" />
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="relative flex gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse flex-shrink-0" />
                  <Card className="flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-2" />
                          <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                        </div>
                        <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
