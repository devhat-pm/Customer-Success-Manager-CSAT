import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'primary',
  suffix,
  prefix,
  trend,
  children
}) {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success'
    if (trend === 'down') return 'text-danger'
    return 'text-slate-500'
  }

  const getIconBgColor = () => {
    const colors = {
      primary: 'bg-gradient-to-br from-primary/20 to-secondary/20',
      success: 'bg-gradient-to-br from-success/20 to-emerald-300/20',
      warning: 'bg-gradient-to-br from-warning/20 to-amber-300/20',
      danger: 'bg-gradient-to-br from-danger/20 to-rose-300/20',
      accent: 'bg-gradient-to-br from-accent/20 to-indigo-300/20',
    }
    return colors[iconColor] || colors.primary
  }

  const getIconColor = () => {
    const colors = {
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
      accent: 'text-accent',
    }
    return colors[iconColor] || colors.primary
  }

  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
              {prefix && <span className="text-lg text-slate-400">{prefix}</span>}
              <span className="text-2xl font-bold text-slate-800">{value}</span>
              {suffix && <span className="text-lg text-slate-400">{suffix}</span>}
            </div>
            {(change !== undefined || changeLabel) && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="font-medium">{change}</span>
                {changeLabel && <span className="text-slate-400">{changeLabel}</span>}
              </div>
            )}
            {children}
          </div>
          {Icon && (
            <div className={`p-3 rounded-xl ${getIconBgColor()}`}>
              <Icon className={`w-6 h-6 ${getIconColor()}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export function GaugeStatCard({ title, value, max = 100, icon: Icon, iconColor = 'primary' }) {
  const percentage = Math.min((value / max) * 100, 100)
  const getColor = () => {
    if (percentage >= 80) return { stroke: '#4CAF50', bg: 'success' }
    if (percentage >= 60) return { stroke: '#2196F3', bg: 'secondary' }
    if (percentage >= 40) return { stroke: '#FF9800', bg: 'warning' }
    return { stroke: '#F44336', bg: 'critical' }
  }
  const color = getColor()

  const getIconBgColor = () => {
    const colors = {
      primary: 'bg-gradient-to-br from-primary/20 to-secondary/20',
      success: 'bg-gradient-to-br from-success/20 to-emerald-300/20',
      warning: 'bg-gradient-to-br from-warning/20 to-amber-300/20',
      danger: 'bg-gradient-to-br from-danger/20 to-rose-300/20',
    }
    return colors[iconColor] || colors.primary
  }

  const getIconColor = () => {
    const colors = {
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
    }
    return colors[iconColor] || colors.primary
  }

  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth="3"
                    strokeDasharray={`${percentage}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-800">{value}</span>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                <p>out of {max}</p>
                <p className={`font-medium text-${color.bg}`}>
                  {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 40 ? 'At Risk' : 'Critical'}
                </p>
              </div>
            </div>
          </div>
          {Icon && (
            <div className={`p-3 rounded-xl ${getIconBgColor()}`}>
              <Icon className={`w-6 h-6 ${getIconColor()}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function NPSStatCard({ title, value, icon: Icon }) {
  const getSentiment = () => {
    if (value >= 50) return { label: 'Excellent', color: 'success', emoji: '🎉' }
    if (value >= 30) return { label: 'Good', color: 'primary', emoji: '👍' }
    if (value >= 0) return { label: 'Okay', color: 'warning', emoji: '😐' }
    return { label: 'Needs Work', color: 'danger', emoji: '😟' }
  }
  const sentiment = getSentiment()

  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-slate-800">{value}</span>
              <span className="text-2xl">{sentiment.emoji}</span>
            </div>
            <p className={`text-sm font-medium text-${sentiment.color} mt-1`}>
              {sentiment.label}
            </p>
          </div>
          {Icon && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent/20 to-indigo-300/20">
              <Icon className="w-6 h-6 text-accent" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AlertsStatCard({ title, total, critical, high, medium, low, icon: Icon }) {
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <span className="text-2xl font-bold text-slate-800">{total}</span>
            <div className="flex items-center gap-2 mt-2">
              {critical > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-danger/10 text-danger rounded-full">
                  {critical} critical
                </span>
              )}
              {high > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-warning/10 text-warning rounded-full">
                  {high} high
                </span>
              )}
              {(medium > 0 || low > 0) && (
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                  +{medium + low} other
                </span>
              )}
            </div>
          </div>
          {Icon && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-danger/20 to-rose-300/20">
              <Icon className="w-6 h-6 text-danger" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
