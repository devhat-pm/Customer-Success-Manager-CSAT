import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Calendar,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

export function InteractionMetrics({ data, isLoading }) {
  if (isLoading) {
    return <InteractionMetricsSkeleton />
  }

  const totalInteractions = data?.total_interactions || 0
  const lastMonthInteractions = data?.last_month_interactions || 0
  const meetingsThisWeek = data?.meetings_this_week || 0
  const pendingFollowups = data?.pending_followups || 0
  const negativeSentiment = data?.negative_sentiment_count || 0
  const overdueFollowups = data?.overdue_followups || 0

  const interactionTrend = lastMonthInteractions > 0
    ? Math.round(((totalInteractions - lastMonthInteractions) / lastMonthInteractions) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Interactions */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Interactions</p>
              <p className="text-3xl font-bold text-slate-800">{totalInteractions}</p>
              <div className="flex items-center gap-2 mt-2">
                {interactionTrend !== 0 && (
                  <>
                    {interactionTrend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-danger" />
                    )}
                    <span className={`text-xs font-medium ${interactionTrend > 0 ? 'text-success' : 'text-danger'}`}>
                      {interactionTrend > 0 ? '+' : ''}{interactionTrend}%
                    </span>
                  </>
                )}
                <span className="text-xs text-slate-400">this month</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meetings This Week */}
      <Card className="card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Meetings This Week</p>
              <p className="text-3xl font-bold text-slate-800">{meetingsThisWeek}</p>
              <p className="text-xs text-slate-400 mt-2">scheduled meetings</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/10">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Follow-ups */}
      <Card className={`card-hover ${pendingFollowups > 0 ? 'border-l-4 border-l-warning' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending Follow-ups</p>
              <p className={`text-3xl font-bold ${pendingFollowups > 0 ? 'text-warning' : 'text-slate-800'}`}>
                {pendingFollowups}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {overdueFollowups > 0 && (
                  <Badge variant="danger" className="text-xs">
                    {overdueFollowups} overdue
                  </Badge>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${pendingFollowups > 0 ? 'bg-warning/10' : 'bg-slate-100'}`}>
              <Clock className={`w-6 h-6 ${pendingFollowups > 0 ? 'text-warning' : 'text-slate-400'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Negative Sentiment */}
      <Card className={`card-hover ${negativeSentiment > 0 ? 'border-l-4 border-l-danger' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Negative Sentiment</p>
              <p className={`text-3xl font-bold ${negativeSentiment > 0 ? 'text-danger' : 'text-success'}`}>
                {negativeSentiment}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {negativeSentiment === 0 ? 'All clear!' : 'needs attention'}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${negativeSentiment > 0 ? 'bg-danger/10' : 'bg-success/10'}`}>
              <AlertCircle className={`w-6 h-6 ${negativeSentiment > 0 ? 'text-danger' : 'text-success'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InteractionMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-28 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
