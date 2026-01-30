import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export function NPSBreakdownChart({ data, isLoading }) {
  if (isLoading) {
    return <NPSBreakdownSkeleton />
  }

  const promoters = data?.promoters_count || 0
  const passives = data?.passives_count || 0
  const detractors = data?.detractors_count || 0
  const total = promoters + passives + detractors

  const promotersPct = total > 0 ? (promoters / total) * 100 : 0
  const passivesPct = total > 0 ? (passives / total) * 100 : 0
  const detractorsPct = total > 0 ? (detractors / total) * 100 : 0

  const npsScore = data?.nps_score ?? Math.round(promotersPct - detractorsPct)

  const breakdownData = [
    { name: 'Detractors', value: detractorsPct, count: detractors, color: '#F44336', range: '0-6' },
    { name: 'Passives', value: passivesPct, count: passives, color: '#FF9800', range: '7-8' },
    { name: 'Promoters', value: promotersPct, count: promoters, color: '#4CAF50', range: '9-10' },
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value, count, range } = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800">{name}</p>
          <p className="text-sm text-slate-500">Score: {range}</p>
          <p className="text-sm text-slate-600">{count} responses ({value.toFixed(1)}%)</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">NPS Breakdown</CardTitle>
          <Badge
            variant={npsScore >= 50 ? 'success' : npsScore >= 0 ? 'warning' : 'danger'}
            className="text-sm px-3"
          >
            NPS: {npsScore > 0 ? '+' : ''}{npsScore}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stacked Horizontal Bar */}
        <div className="mb-6">
          <div className="h-8 rounded-lg overflow-hidden flex">
            {breakdownData.map((item) => (
              item.value > 0 && (
                <div
                  key={item.name}
                  className="h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-300"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  title={`${item.name}: ${item.value.toFixed(1)}%`}
                >
                  {item.value >= 15 && `${item.value.toFixed(0)}%`}
                </div>
              )
            ))}
          </div>
        </div>

        {/* Legend with Details */}
        <div className="space-y-3">
          {breakdownData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400">Score {item.range}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{item.count}</p>
                <p className="text-xs text-slate-500">{item.value.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>

        {/* Vertical Bar Chart */}
        <div className="h-40 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} layout="horizontal">
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function NPSGauge({ score, size = 'md' }) {
  const sizes = {
    sm: { width: 80, fontSize: 'text-lg' },
    md: { width: 120, fontSize: 'text-2xl' },
    lg: { width: 160, fontSize: 'text-3xl' },
  }

  const config = sizes[size] || sizes.md
  const color = score >= 50 ? '#4CAF50' : score >= 0 ? '#FF9800' : '#F44336'

  // NPS ranges from -100 to 100, normalize to 0-180 degrees
  const normalizedScore = (score + 100) / 200
  const angle = normalizedScore * 180

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width / 2 }}>
        <svg
          viewBox="0 0 100 50"
          className="overflow-visible"
          style={{ width: config.width, height: config.width / 2 }}
        >
          {/* Background arc */}
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d={describeArc(50, 50, 45, 180, 180 + angle)}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Labels */}
          <text x="5" y="58" fontSize="8" fill="#94A3B8">-100</text>
          <text x="47" y="10" fontSize="8" fill="#94A3B8">0</text>
          <text x="85" y="58" fontSize="8" fill="#94A3B8">+100</text>
        </svg>
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 font-bold ${config.fontSize}`}
          style={{ color }}
        >
          {score > 0 ? '+' : ''}{score}
        </div>
      </div>
    </div>
  )
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ')
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 180) * Math.PI / 180
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  }
}

function NPSBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-slate-200 rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-slate-200 rounded-full animate-pulse" />
                <div>
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-8 bg-slate-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-10 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
