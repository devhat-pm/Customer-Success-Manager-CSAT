import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const HEALTH_SEGMENTS = [
  { key: 'excellent', label: 'Excellent', range: '80-100', color: '#4CAF50', bgColor: 'bg-success-500', lightBg: 'bg-success-50', textColor: 'text-success-600' },
  { key: 'good', label: 'Good', range: '60-79', color: '#2196F3', bgColor: 'bg-secondary-500', lightBg: 'bg-secondary-50', textColor: 'text-secondary-600' },
  { key: 'at_risk', label: 'At Risk', range: '40-59', color: '#FF9800', bgColor: 'bg-warning-500', lightBg: 'bg-warning-50', textColor: 'text-warning-600' },
  { key: 'critical', label: 'Critical', range: '0-39', color: '#F44336', bgColor: 'bg-critical-500', lightBg: 'bg-critical-50', textColor: 'text-critical-600' },
]

export function HealthDistributionChart({ data, isLoading }) {
  const navigate = useNavigate()
  const [hoveredSegment, setHoveredSegment] = useState(null)

  if (isLoading) {
    return <HealthDistributionChartSkeleton />
  }

  const segments = HEALTH_SEGMENTS.map(segment => ({
    ...segment,
    count: data?.[segment.key]?.count || 0,
    percentage: data?.[segment.key]?.percentage || 0,
  }))

  const totalCustomers = data?.total_scored || segments.reduce((sum, s) => sum + s.count, 0)

  const handleClick = (segment) => {
    const healthRanges = {
      excellent: { min: 80, max: 100 },
      good: { min: 60, max: 79 },
      at_risk: { min: 40, max: 59 },
      critical: { min: 0, max: 39 },
    }
    const range = healthRanges[segment.key]
    if (range) {
      navigate(`/customers?health_min=${range.min}&health_max=${range.max}`)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Health Score Distribution</CardTitle>
        <CardDescription>
          {totalCustomers} customers scored
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Modern horizontal stacked bar */}
        <div className="relative">
          <div className="h-12 rounded-xl overflow-hidden flex shadow-inner bg-slate-100">
            {segments.map((segment) => (
              segment.percentage > 0 && (
                <div
                  key={segment.key}
                  className={cn(
                    "h-full transition-all duration-300 cursor-pointer relative group",
                    hoveredSegment && hoveredSegment !== segment.key ? 'opacity-50' : 'opacity-100'
                  )}
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.color,
                  }}
                  onMouseEnter={() => setHoveredSegment(segment.key)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() => handleClick(segment)}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {segment.label}: {segment.count} ({segment.percentage.toFixed(1)}%)
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                  {/* Show percentage if segment is wide enough */}
                  {segment.percentage > 15 && (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
                      {segment.percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              )
            ))}
          </div>
        </div>

        {/* Modern segment cards */}
        <div className="grid grid-cols-2 gap-3">
          {segments.map((segment) => (
            <button
              key={segment.key}
              onClick={() => handleClick(segment)}
              onMouseEnter={() => setHoveredSegment(segment.key)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                segment.lightBg,
                hoveredSegment === segment.key ? 'ring-2 ring-offset-1' : 'hover:shadow-md',
              )}
              style={{
                '--tw-ring-color': segment.color
              }}
            >
              {/* Circular progress indicator */}
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="3"
                    strokeDasharray={`${segment.percentage}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", segment.textColor)}>
                  {segment.count}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn("font-semibold text-sm", segment.textColor)}>
                    {segment.label}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Score: {segment.range}
                </div>
                <div className={cn("text-xs font-medium", segment.textColor)}>
                  {segment.percentage.toFixed(1)}% of total
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center">
          Click any segment to view customers
        </p>
      </CardContent>
    </Card>
  )
}

export function HealthDistributionChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-100 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
