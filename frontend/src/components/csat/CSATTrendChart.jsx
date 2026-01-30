import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'

const surveyTypes = [
  { value: 'all', label: 'All Surveys' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'quarterly', label: 'Quarterly Review' },
  { value: 'support', label: 'Support Ticket' },
  { value: 'feature', label: 'Feature Feedback' },
]

export function CSATTrendChart({ data, isLoading, onFilterChange }) {
  const [surveyType, setSurveyType] = useState('all')
  const [timeRange, setTimeRange] = useState('6m')

  const handleSurveyTypeChange = (value) => {
    setSurveyType(value)
    onFilterChange?.({ surveyType: value, timeRange })
  }

  const handleTimeRangeChange = (range) => {
    setTimeRange(range)
    onFilterChange?.({ surveyType, timeRange: range })
  }

  if (isLoading) {
    return <CSATTrendChartSkeleton />
  }

  // Format data for chart
  const chartData = (data || []).map((item) => {
    // Handle month format "YYYY-MM" from backend
    let dateLabel = ''
    if (item.month) {
      try {
        // Add day to make it a valid ISO date
        dateLabel = format(parseISO(`${item.month}-01`), 'MMM yyyy')
      } catch {
        dateLabel = item.month
      }
    } else if (item.date) {
      try {
        dateLabel = format(parseISO(item.date), 'MMM yyyy')
      } catch {
        dateLabel = item.date
      }
    }
    return {
      date: dateLabel,
      score: item.average_score || item.avg_score || item.score || 0,
      responses: item.response_count || item.responses || 0,
    }
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800 mb-1">{label}</p>
          <p className="text-sm text-warning">
            CSAT: {payload[0]?.value?.toFixed(2)} / 5
          </p>
          <p className="text-sm text-slate-500">
            {payload[0]?.payload?.responses} responses
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">CSAT Trend</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={surveyType} onValueChange={handleSurveyTypeChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {surveyTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center border border-slate-200 rounded-lg">
              {['3m', '6m', '1y'].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => handleTimeRangeChange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis
                  domain={[0, 5]}
                  tick={{ fontSize: 11 }}
                  stroke="#94A3B8"
                  ticks={[0, 1, 2, 3, 4, 5]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={4} stroke="#4CAF50" strokeDasharray="5 5" label="Good" />
                <ReferenceLine y={3} stroke="#FF9800" strokeDasharray="5 5" label="Average" />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#9C27B0"
                  strokeWidth={2}
                  dot={{ fill: '#9C27B0', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-500">No trend data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CSATTrendChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </div>
      </CardContent>
    </Card>
  )
}
