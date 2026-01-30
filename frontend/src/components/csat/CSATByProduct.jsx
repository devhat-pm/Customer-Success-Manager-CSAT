import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Star,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'

const productColors = {
  'SupportX Core': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary' },
  'SupportX Pro': { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary' },
  'SupportX Enterprise': { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent' },
  default: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
}

export function CSATByProduct({ data, isLoading }) {
  if (isLoading) {
    return <CSATByProductSkeleton />
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">No product data available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((product) => (
        <ProductCard key={product.product} product={product} />
      ))}
    </div>
  )
}

function ProductCard({ product }) {
  const colors = productColors[product.product] || productColors.default
  const avgScore = product.avg_score || 0
  const responseCount = product.response_count || 0
  const trend = product.trend || 0

  return (
    <Card className={`card-hover border-l-4 ${colors.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{product.product}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {responseCount} responses
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Star className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Average Score</p>
              <p className="text-xl font-bold text-slate-800">
                {avgScore.toFixed(1)}<span className="text-sm text-slate-400">/5</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {trend > 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm text-success">+{trend.toFixed(1)}</span>
              </>
            ) : trend < 0 ? (
              <>
                <TrendingDown className="w-4 h-4 text-danger" />
                <span className="text-sm text-danger">{trend.toFixed(1)}</span>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">0.0</span>
              </>
            )}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Score Distribution</p>
          {[5, 4, 3, 2, 1].map((score) => {
            const count = product.distribution?.[score] || 0
            const pct = responseCount > 0 ? (count / responseCount) * 100 : 0
            return (
              <div key={score} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-8">{score} star</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      score >= 4 ? 'bg-success' : score >= 3 ? 'bg-warning' : 'bg-danger'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-8">{count}</span>
              </div>
            )
          })}
        </div>

        {/* Recent Feedback */}
        {product.recent_feedback && product.recent_feedback.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Recent Feedback</p>
            <div className="space-y-2">
              {product.recent_feedback.slice(0, 2).map((feedback, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">
                      {feedback.customer_name}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= feedback.score
                              ? 'text-warning fill-warning'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {feedback.comment || 'No comment provided'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CSATByProductSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
              <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse" />
                <div>
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-6 w-12 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-3 w-8 bg-slate-200 rounded animate-pulse" />
                  <div className="flex-1 h-2 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-6 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
