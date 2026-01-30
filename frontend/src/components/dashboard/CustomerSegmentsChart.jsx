import { useState } from 'react'
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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, PieChartIcon } from 'lucide-react'

const INDUSTRY_COLORS = [
  '#9C27B0',
  '#2196F3',
  '#7C4DFF',
  '#4CAF50',
  '#FF9800',
  '#FF5722',
  '#00BCD4',
  '#AB47BC',
]

const HEALTH_COLORS = {
  excellent: '#4CAF50',
  good: '#2196F3',
  at_risk: '#FF9800',
  critical: '#F44336',
}

export function CustomerSegmentsChart({ data, isLoading }) {
  const [viewType, setViewType] = useState('industry') // 'industry' or 'health'
  const [chartType, setChartType] = useState('bar') // 'bar' or 'pie'

  if (isLoading) {
    return <CustomerSegmentsChartSkeleton />
  }

  const industryData = data?.by_industry?.map((item, index) => ({
    name: item.name || 'Other',
    value: item.count,
    percentage: item.percentage,
    color: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length],
  })) || []

  const healthData = data?.by_health_status?.map((item) => {
    // Map backend names to colors
    let color = '#94A3B8' // default gray
    const nameLower = item.name.toLowerCase()
    if (nameLower.includes('excellent')) color = HEALTH_COLORS.excellent
    else if (nameLower.includes('good')) color = HEALTH_COLORS.good
    else if (nameLower.includes('risk')) color = HEALTH_COLORS.at_risk
    else if (nameLower.includes('critical')) color = HEALTH_COLORS.critical

    return {
      name: item.name.replace(/\s*\([^)]*\)/g, ''), // Remove score range from name
      value: item.count,
      percentage: item.percentage,
      color,
    }
  }).filter(item => item.value > 0) || []

  const chartData = viewType === 'industry' ? industryData : healthData

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-slate-100">
          <p className="font-medium text-slate-800">{data.name}</p>
          <p className="text-sm text-slate-600">{data.value} customers</p>
          {data.percentage && (
            <p className="text-xs text-slate-500">{data.percentage.toFixed(1)}%</p>
          )}
        </div>
      )
    }
    return null
  }

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={true} vertical={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Customer Segments</CardTitle>
          <CardDescription>Distribution by {viewType}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* View type toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <Button
              variant={viewType === 'industry' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setViewType('industry')}
            >
              Industry
            </Button>
            <Button
              variant={viewType === 'health' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setViewType('health')}
            >
              Health
            </Button>
          </div>
          {/* Chart type toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={chartType === 'pie' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          {chartData.length > 0 ? (
            chartType === 'bar' ? renderBarChart() : renderPieChart()
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              No segment data available
            </div>
          )}
        </div>

        {/* Legend for bar chart */}
        {chartType === 'bar' && chartData.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {chartData.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CustomerSegmentsChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-28 bg-slate-200 rounded animate-pulse mt-1" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-7 w-14 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56 space-y-3">
          {[80, 65, 50, 35, 20].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              <div
                className="h-6 bg-slate-200 rounded animate-pulse"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
