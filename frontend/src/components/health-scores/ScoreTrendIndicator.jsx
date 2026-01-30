import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react'

export function ScoreTrendIndicator({ trend, change, size = 'md', showChange = true }) {
  const getTrendConfig = () => {
    const isUp = trend === 'improving' || trend === 'up' || (change !== undefined && change > 0)
    const isDown = trend === 'declining' || trend === 'down' || (change !== undefined && change < 0)

    if (isUp) {
      return {
        Icon: TrendingUp,
        color: 'text-success',
        bg: 'bg-success/10',
        label: 'Improving',
      }
    }
    if (isDown) {
      return {
        Icon: TrendingDown,
        color: 'text-danger',
        bg: 'bg-danger/10',
        label: 'Declining',
      }
    }
    return {
      Icon: Minus,
      color: 'text-slate-400',
      bg: 'bg-slate-100',
      label: 'Stable',
    }
  }

  const config = getTrendConfig()
  const Icon = config.Icon

  const sizeClasses = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'p-1' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'p-1.5' },
    lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'p-2' },
  }

  const sizeConfig = sizeClasses[size] || sizeClasses.md

  return (
    <div className="flex items-center gap-1">
      <div className={`${config.bg} rounded-full ${sizeConfig.padding}`}>
        <Icon className={`${sizeConfig.icon} ${config.color}`} />
      </div>
      {showChange && change !== undefined && change !== 0 && (
        <span className={`font-medium ${sizeConfig.text} ${config.color}`}>
          {change > 0 ? '+' : ''}{change}
        </span>
      )}
    </div>
  )
}

export function CompactTrendIndicator({ trend, change }) {
  const isUp = trend === 'improving' || trend === 'up' || (change !== undefined && change > 0)
  const isDown = trend === 'declining' || trend === 'down' || (change !== undefined && change < 0)

  if (isUp) {
    return (
      <div className="flex items-center gap-0.5 text-success">
        <ArrowUp className="w-3 h-3" />
        {change !== undefined && <span className="text-xs font-medium">+{change}</span>}
      </div>
    )
  }

  if (isDown) {
    return (
      <div className="flex items-center gap-0.5 text-danger">
        <ArrowDown className="w-3 h-3" />
        {change !== undefined && <span className="text-xs font-medium">{change}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center text-slate-400">
      <Minus className="w-3 h-3" />
    </div>
  )
}

export function TrendBadge({ trend, change }) {
  const getTrendConfig = () => {
    const isUp = trend === 'improving' || trend === 'up' || (change !== undefined && change > 0)
    const isDown = trend === 'declining' || trend === 'down' || (change !== undefined && change < 0)

    if (isUp) {
      return {
        Icon: TrendingUp,
        color: 'text-success',
        bg: 'bg-success/10',
        label: 'Improving',
      }
    }
    if (isDown) {
      return {
        Icon: TrendingDown,
        color: 'text-danger',
        bg: 'bg-danger/10',
        label: 'Declining',
      }
    }
    return {
      Icon: Minus,
      color: 'text-slate-500',
      bg: 'bg-slate-100',
      label: 'Stable',
    }
  }

  const config = getTrendConfig()
  const Icon = config.Icon

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg}`}>
      <Icon className={`w-3 h-3 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
    </div>
  )
}
