import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'

export function HealthScoreCard({ score, trend, previousScore, customerId }) {
  const getScoreColor = (s) => {
    if (s >= 80) return { bg: 'bg-success', text: 'text-success', label: 'Excellent' }
    if (s >= 60) return { bg: 'bg-primary', text: 'text-primary', label: 'Good' }
    if (s >= 40) return { bg: 'bg-warning', text: 'text-warning', label: 'At Risk' }
    return { bg: 'bg-danger', text: 'text-danger', label: 'Critical' }
  }

  const getTrendInfo = () => {
    if (trend === 'up' || (previousScore !== undefined && score > previousScore)) {
      return {
        icon: TrendingUp,
        color: 'text-success',
        label: previousScore !== undefined ? `+${score - previousScore} pts` : 'Improving',
      }
    }
    if (trend === 'down' || (previousScore !== undefined && score < previousScore)) {
      return {
        icon: TrendingDown,
        color: 'text-danger',
        label: previousScore !== undefined ? `${score - previousScore} pts` : 'Declining',
      }
    }
    return { icon: Minus, color: 'text-slate-400', label: 'Stable' }
  }

  const scoreInfo = getScoreColor(score)
  const trendInfo = getTrendInfo()
  const TrendIcon = trendInfo.icon

  // Calculate the stroke dasharray for the circle
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-500">Health Score</h3>
          {customerId && (
            <Link
              to={`/customers/${customerId}?tab=health`}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Details
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Circular gauge */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                className={scoreInfo.text}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${scoreInfo.text}`}>{score}</span>
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>

          {/* Score info */}
          <div className="flex-1">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${scoreInfo.bg}/10 ${scoreInfo.text} mb-3`}>
              {scoreInfo.label}
            </div>
            <div className={`flex items-center gap-1.5 ${trendInfo.color}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{trendInfo.label}</span>
            </div>
            {previousScore !== undefined && (
              <p className="text-xs text-slate-400 mt-1">
                vs {previousScore} last period
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthScoreGauge({ label, score, weight, size = 'md' }) {
  const getScoreColor = (s) => {
    if (s >= 80) return '#4CAF50'
    if (s >= 60) return '#2196F3'
    if (s >= 40) return '#FF9800'
    return '#F44336'
  }

  const sizes = {
    sm: { width: 64, strokeWidth: 6, fontSize: 'text-lg', radius: 26 },
    md: { width: 80, strokeWidth: 8, fontSize: 'text-xl', radius: 32 },
    lg: { width: 100, strokeWidth: 10, fontSize: 'text-2xl', radius: 40 },
  }

  const sizeConfig = sizes[size] || sizes.md
  const circumference = 2 * Math.PI * sizeConfig.radius
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`
  const color = getScoreColor(score)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: sizeConfig.width, height: sizeConfig.width }}>
        <svg
          className="-rotate-90"
          viewBox={`0 0 ${sizeConfig.width + 10} ${sizeConfig.width + 10}`}
          style={{ width: sizeConfig.width, height: sizeConfig.width }}
        >
          {/* Background circle */}
          <circle
            cx={(sizeConfig.width + 10) / 2}
            cy={(sizeConfig.width + 10) / 2}
            r={sizeConfig.radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={sizeConfig.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={(sizeConfig.width + 10) / 2}
            cy={(sizeConfig.width + 10) / 2}
            r={sizeConfig.radius}
            fill="none"
            stroke={color}
            strokeWidth={sizeConfig.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${sizeConfig.fontSize}`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-700 mt-2">{label}</p>
      {weight && (
        <p className="text-xs text-slate-400">{weight}% weight</p>
      )}
    </div>
  )
}

export function HealthScoreCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-full border-8 border-slate-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-7 w-20 bg-slate-200 rounded-full animate-pulse mb-3" />
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
