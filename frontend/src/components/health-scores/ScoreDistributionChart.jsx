import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { BarChart3, PieChart as PieChartIcon, Info } from 'lucide-react'

const statusColors = {
  critical: '#F44336',
  at_risk: '#FF9800',
  good: '#2196F3',
  excellent: '#4CAF50',
}

export function ScoreDistributionChart({ customers, isLoading, onSegmentClick }) {
  const [chartType, setChartType] = useState('bar') // 'bar' or 'pie'

  // Calculate distribution
  const distribution = useMemo(() => {
    if (!customers || customers.length === 0) {
      return {
        histogram: [],
        byStatus: [],
      }
    }

    // Histogram data (10-point buckets)
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i * 10 + 9}`,
      min: i * 10,
      max: i * 10 + 9,
      count: 0,
      customers: [],
    }))

    // Count by status
    const statusCounts = {
      critical: { count: 0, value: 0 },
      at_risk: { count: 0, value: 0 },
      good: { count: 0, value: 0 },
      excellent: { count: 0, value: 0 },
    }

    customers.forEach((customer) => {
      const score = customer.health_score || 0
      const bucketIndex = Math.min(Math.floor(score / 10), 9)
      buckets[bucketIndex].count++
      buckets[bucketIndex].customers.push(customer)

      // Status counts
      const contractValue = customer.contract_value || 0
      if (score >= 80) {
        statusCounts.excellent.count++
        statusCounts.excellent.value += contractValue
      } else if (score >= 60) {
        statusCounts.good.count++
        statusCounts.good.value += contractValue
      } else if (score >= 40) {
        statusCounts.at_risk.count++
        statusCounts.at_risk.value += contractValue
      } else {
        statusCounts.critical.count++
        statusCounts.critical.value += contractValue
      }
    })

    const byStatus = [
      { name: 'Excellent', value: statusCounts.excellent.count, contractValue: statusCounts.excellent.value, fill: statusColors.excellent },
      { name: 'Good', value: statusCounts.good.count, contractValue: statusCounts.good.value, fill: statusColors.good },
      { name: 'At Risk', value: statusCounts.at_risk.count, contractValue: statusCounts.at_risk.value, fill: statusColors.at_risk },
      { name: 'Critical', value: statusCounts.critical.count, contractValue: statusCounts.critical.value, fill: statusColors.critical },
    ]

    return {
      histogram: buckets,
      byStatus,
      total: customers.length,
    }
  }, [customers])

  if (isLoading) {
    return <ScoreDistributionChartSkeleton />
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Score Distribution</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant={chartType === 'pie' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartType === 'bar' ? (
          <HistogramChart
            data={distribution.histogram}
            total={distribution.total}
            onBarClick={onSegmentClick}
          />
        ) : (
          <StatusPieChart
            data={distribution.byStatus}
            total={distribution.total}
            onSegmentClick={onSegmentClick}
          />
        )}
      </CardContent>
    </Card>
  )
}

function HistogramChart({ data, total, onBarClick }) {
  const getBarColor = (min) => {
    if (min >= 80) return statusColors.excellent
    if (min >= 60) return statusColors.good
    if (min >= 40) return statusColors.at_risk
    return statusColors.critical
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { range, count, customers } = payload[0].payload
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800">Score: {range}</p>
          <p className="text-sm text-slate-600">
            {count} customer{count !== 1 ? 's' : ''} ({percentage}%)
          </p>
          {customers && customers.length > 0 && customers.length <= 3 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              {customers.map((c, i) => (
                <p key={i} className="text-xs text-slate-500 truncate max-w-[150px]">
                  {c.company_name}
                </p>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10 }}
            stroke="#94A3B8"
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(data) => onBarClick && onBarClick({ minScore: data.min, maxScore: data.max + 1 })}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.min)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatusPieChart({ data, total, onSegmentClick }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value, contractValue } = payload[0].payload
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800">{name}</p>
          <p className="text-sm text-slate-600">
            {value} customer{value !== 1 ? 's' : ''} ({percentage}%)
          </p>
          {contractValue > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              ${(contractValue / 1000).toFixed(0)}k total ARR
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const handleClick = (entry) => {
    if (!onSegmentClick) return

    const ranges = {
      'Excellent': { minScore: 80, maxScore: 100 },
      'Good': { minScore: 60, maxScore: 80 },
      'At Risk': { minScore: 40, maxScore: 60 },
      'Critical': { minScore: 0, maxScore: 40 },
    }

    onSegmentClick(ranges[entry.name])
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            cursor="pointer"
            onClick={(_, index) => handleClick(data[index])}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-slate-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ScoreDistributionMini({ customers, onSegmentClick }) {
  const distribution = useMemo(() => {
    if (!customers || customers.length === 0) return []

    const statusCounts = {
      critical: 0,
      at_risk: 0,
      good: 0,
      excellent: 0,
    }

    customers.forEach((customer) => {
      const score = customer.health_score || 0
      if (score >= 80) statusCounts.excellent++
      else if (score >= 60) statusCounts.good++
      else if (score >= 40) statusCounts.at_risk++
      else statusCounts.critical++
    })

    const total = customers.length

    return [
      { key: 'critical', label: 'Critical', count: statusCounts.critical, pct: (statusCounts.critical / total) * 100, color: statusColors.critical, range: { minScore: 0, maxScore: 40 } },
      { key: 'at_risk', label: 'At Risk', count: statusCounts.at_risk, pct: (statusCounts.at_risk / total) * 100, color: statusColors.at_risk, range: { minScore: 40, maxScore: 60 } },
      { key: 'good', label: 'Good', count: statusCounts.good, pct: (statusCounts.good / total) * 100, color: statusColors.good, range: { minScore: 60, maxScore: 80 } },
      { key: 'excellent', label: 'Excellent', count: statusCounts.excellent, pct: (statusCounts.excellent / total) * 100, color: statusColors.excellent, range: { minScore: 80, maxScore: 100 } },
    ]
  }, [customers])

  if (distribution.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Stacked Bar */}
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
        {distribution.map((item) => (
          item.pct > 0 && (
            <div
              key={item.key}
              className="h-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{ width: `${item.pct}%`, backgroundColor: item.color }}
              onClick={() => onSegmentClick && onSegmentClick(item.range)}
              title={`${item.label}: ${item.count}`}
            />
          )
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        {distribution.map((item) => (
          <button
            key={item.key}
            className="flex items-center gap-1 hover:opacity-70 transition-opacity"
            onClick={() => onSegmentClick && onSegmentClick(item.range)}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600">{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ScoreTrendsChart({ data, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-slate-400">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No trend data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Score Trends Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="excellent" stackId="a" fill={statusColors.excellent} name="Excellent" />
              <Bar dataKey="good" stackId="a" fill={statusColors.good} name="Good" />
              <Bar dataKey="at_risk" stackId="a" fill={statusColors.at_risk} name="At Risk" />
              <Bar dataKey="critical" stackId="a" fill={statusColors.critical} name="Critical" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreDistributionChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="flex gap-1">
            <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
            <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-around gap-2 px-4">
          {[40, 60, 80, 100, 70, 50, 30, 45, 55, 65].map((h, i) => (
            <div
              key={i}
              className="bg-slate-200 rounded-t animate-pulse flex-1"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
