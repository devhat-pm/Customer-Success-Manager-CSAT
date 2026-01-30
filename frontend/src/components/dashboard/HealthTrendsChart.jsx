import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const PRODUCT_COLORS = {
  MonetX: '#9C27B0',
  SupportX: '#2196F3',
  GreenX: '#4CAF50',
  Overall: '#7C4DFF',
}

const TIME_RANGES = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
]

export function HealthTrendsChart({ data, isLoading, onTimeRangeChange }) {
  const [timeRange, setTimeRange] = useState('30d')
  const [activeProducts, setActiveProducts] = useState(['Overall', 'MonetX', 'SupportX', 'GreenX'])

  const handleTimeRangeChange = (range) => {
    setTimeRange(range)
    onTimeRangeChange?.(range)
  }

  const toggleProduct = (product) => {
    setActiveProducts((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product]
    )
  }

  if (isLoading) {
    return <HealthTrendsChartSkeleton />
  }

  // Transform data for the chart - backend returns { overall: [...], by_product: [...] }
  const chartData = data?.overall?.map((item) => {
    const entry = {
      date: item.period,
      Overall: item.avg_score,
    }
    // Add product-specific scores if available
    data?.by_product?.forEach((productData) => {
      const matchingPeriod = productData.trends?.find(t => t.period === item.period)
      if (matchingPeriod) {
        entry[productData.product] = matchingPeriod.avg_score
      }
    })
    return entry
  }) || []

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 shadow-lg rounded-lg border border-slate-100">
          <p className="font-medium text-slate-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-600">{entry.name}</span>
              </div>
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.value?.toFixed(1) || 'N/A'}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Health Score Trends</CardTitle>
          <CardDescription>Average health scores over time</CardDescription>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-3 text-xs ${
                timeRange === range.value ? '' : 'hover:bg-slate-200'
              }`}
              onClick={() => handleTimeRangeChange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Product toggles */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {Object.entries(PRODUCT_COLORS).map(([product, color]) => (
            <button
              key={product}
              onClick={() => toggleProduct(product)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                activeProducts.includes(product)
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-slate-50 text-slate-400'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-opacity ${
                  activeProducts.includes(product) ? 'opacity-100' : 'opacity-30'
                }`}
                style={{ backgroundColor: color }}
              />
              {product}
            </button>
          ))}
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {Object.entries(PRODUCT_COLORS).map(([product, color]) => (
                activeProducts.includes(product) && (
                  <Line
                    key={product}
                    type="monotone"
                    dataKey={product}
                    stroke={color}
                    strokeWidth={product === 'Overall' ? 3 : 2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                    connectNulls
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend explanation */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
          <span>Score range: 0-100</span>
          <span>•</span>
          <span>Higher is better</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthTrendsChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse mt-1" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-20 bg-slate-200 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-slate-100 rounded-lg animate-pulse flex items-end justify-around p-4">
          {[40, 60, 45, 70, 55, 80, 65, 75, 60, 85].map((h, i) => (
            <div
              key={i}
              className="w-4 bg-slate-200 rounded-t animate-pulse"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
