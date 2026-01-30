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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const getScoreColor = (score) => {
  if (score >= 4.5) return '#4CAF50' // Excellent - green
  if (score >= 4.0) return '#2196F3' // Good - blue
  if (score >= 3.5) return '#FF9800' // Average - orange
  if (score >= 3.0) return '#FF5722' // Below average - deep orange
  return '#F44336' // Poor - red
}

export function CSATTrendsChart({ data, isLoading, onProductChange }) {
  const [selectedProduct, setSelectedProduct] = useState('all')

  const handleProductChange = (value) => {
    setSelectedProduct(value)
    onProductChange?.(value)
  }

  if (isLoading) {
    return <CSATTrendsChartSkeleton />
  }

  // Backend returns { overall: [...], by_product: [...], by_survey_type: [...] }
  const chartData = data?.overall?.map((item) => ({
    month: item.period,
    score: item.avg_score,
    count: item.response_count,
  })) || []

  const avgScore = chartData.length > 0
    ? (chartData.reduce((sum, item) => sum + item.score, 0) / chartData.length).toFixed(1)
    : 'N/A'

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white px-4 py-3 shadow-lg rounded-lg border border-slate-100">
          <p className="font-medium text-slate-800 mb-1">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Average Score</span>
              <span
                className="font-bold"
                style={{ color: getScoreColor(data.score) }}
              >
                {data.score.toFixed(2)}/5
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Responses</span>
              <span className="font-medium text-slate-800">{data.count}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>CSAT Trends</CardTitle>
          <CardDescription>
            Monthly satisfaction scores
            {avgScore !== 'N/A' && (
              <span className="ml-2 font-medium text-slate-700">
                (Avg: {avgScore}/5)
              </span>
            )}
          </CardDescription>
        </div>
        <Select value={selectedProduct} onValueChange={handleProductChange}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="MonetX">MonetX</SelectItem>
            <SelectItem value="SupportX">SupportX</SelectItem>
            <SelectItem value="GreenX">GreenX</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Score legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs">
          {[
            { label: 'Excellent', color: '#4CAF50', range: '4.5-5' },
            { label: 'Good', color: '#2196F3', range: '4-4.5' },
            { label: 'Average', color: '#FF9800', range: '3.5-4' },
            { label: 'Poor', color: '#F44336', range: '<3' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function CSATTrendsChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mt-1" />
        </div>
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-56 flex items-end justify-around gap-2">
          {[60, 75, 55, 80, 70, 85, 65, 78, 72, 88, 68, 82].map((h, i) => (
            <div
              key={i}
              className="flex-1 max-w-10 bg-slate-200 rounded-t animate-pulse"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
