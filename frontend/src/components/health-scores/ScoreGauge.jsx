import { useMemo } from 'react'

const getScoreColor = (score) => {
  if (score >= 80) return { color: '#4CAF50', label: 'Excellent', bg: 'bg-success/10' }
  if (score >= 60) return { color: '#2196F3', label: 'Good', bg: 'bg-secondary/10' }
  if (score >= 40) return { color: '#FF9800', label: 'At Risk', bg: 'bg-warning/10' }
  return { color: '#F44336', label: 'Critical', bg: 'bg-critical/10' }
}

export function ScoreGauge({
  score,
  size = 'md',
  showLabel = true,
  showValue = true,
  label,
  animated = true,
}) {
  const sizes = {
    xs: { width: 48, stroke: 4, fontSize: 'text-sm', radius: 18 },
    sm: { width: 64, stroke: 5, fontSize: 'text-lg', radius: 26 },
    md: { width: 80, stroke: 6, fontSize: 'text-xl', radius: 32 },
    lg: { width: 100, stroke: 8, fontSize: 'text-2xl', radius: 40 },
    xl: { width: 140, stroke: 10, fontSize: 'text-4xl', radius: 56 },
  }

  const config = sizes[size] || sizes.md
  const scoreInfo = getScoreColor(score)

  const circumference = useMemo(() => 2 * Math.PI * config.radius, [config.radius])
  const strokeDasharray = useMemo(
    () => `${(score / 100) * circumference} ${circumference}`,
    [score, circumference]
  )

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: config.width, height: config.width }}
      >
        <svg
          className="-rotate-90"
          viewBox={`0 0 ${config.width + 10} ${config.width + 10}`}
          style={{ width: config.width, height: config.width }}
        >
          {/* Background circle */}
          <circle
            cx={(config.width + 10) / 2}
            cy={(config.width + 10) / 2}
            r={config.radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={(config.width + 10) / 2}
            cy={(config.width + 10) / 2}
            r={config.radius}
            fill="none"
            stroke={scoreInfo.color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            className={animated ? 'transition-all duration-700 ease-out' : ''}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`font-bold ${config.fontSize}`}
              style={{ color: scoreInfo.color }}
            >
              {score}
            </span>
          </div>
        )}
      </div>
      {showLabel && label && (
        <p className="text-sm font-medium text-slate-700 mt-2">{label}</p>
      )}
      {showLabel && !label && (
        <p className="text-xs text-slate-500 mt-1">{scoreInfo.label}</p>
      )}
    </div>
  )
}

export function MiniScoreGauge({ score, label, size = 'xs' }) {
  const sizes = {
    xs: { width: 40, stroke: 3, fontSize: 'text-xs', radius: 16 },
    sm: { width: 48, stroke: 4, fontSize: 'text-sm', radius: 18 },
  }

  const config = sizes[size] || sizes.xs
  const scoreInfo = getScoreColor(score)
  const circumference = 2 * Math.PI * config.radius
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: config.width, height: config.width }}
      >
        <svg
          className="-rotate-90"
          viewBox={`0 0 ${config.width + 6} ${config.width + 6}`}
          style={{ width: config.width, height: config.width }}
        >
          <circle
            cx={(config.width + 6) / 2}
            cy={(config.width + 6) / 2}
            r={config.radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={config.stroke}
          />
          <circle
            cx={(config.width + 6) / 2}
            cy={(config.width + 6) / 2}
            r={config.radius}
            fill="none"
            stroke={scoreInfo.color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-semibold ${config.fontSize}`} style={{ color: scoreInfo.color }}>
            {score}
          </span>
        </div>
      </div>
      {label && (
        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-12 text-center">{label}</p>
      )}
    </div>
  )
}

export function ScoreGaugeSkeleton({ size = 'md' }) {
  const sizes = {
    sm: 64,
    md: 80,
    lg: 100,
    xl: 140,
  }
  const width = sizes[size] || sizes.md

  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-full border-4 border-slate-200 animate-pulse"
        style={{ width, height: width }}
      />
      <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mt-2" />
    </div>
  )
}
