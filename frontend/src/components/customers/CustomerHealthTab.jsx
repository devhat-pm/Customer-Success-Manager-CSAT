import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthScoreGauge } from './HealthScoreCard'
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
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react'

const TIME_RANGES = [
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '180d', label: '6 Months' },
  { value: '1y', label: '1 Year' },
]

export function CustomerHealthTab({ customer }) {
  const [timeRange, setTimeRange] = useState('90d')
  const [page, setPage] = useState(1)
  const limit = 10
  const customerId = customer?.id

  // Fetch health history
  const { data, isLoading } = useQuery({
    queryKey: ['customer-health-history', customerId, timeRange, page],
    queryFn: () =>
      customersAPI.getHealthHistory(customerId, {
        range: timeRange,
        skip: (page - 1) * limit,
        limit,
      }).then(res => res.data),
    enabled: !!customerId,
  })

  const history = data?.health_scores || data?.history || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  // Get latest health score details
  const latestScore = history[0]

  // Transform data for chart - use new field names per specification
  const chartData = [...history].reverse().map((item) => ({
    date: new Date(item.calculated_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    overall: item.overall_score,
    productAdoption: item.product_adoption_score || item.adoption_score || 0,
    supportHealth: item.support_health_score || item.support_score || 0,
    engagement: item.engagement_score || 0,
    financialHealth: item.financial_health_score || item.financial_score || 0,
    slaCompliance: item.sla_compliance_score || 100,
  }))

  const getTrendInfo = (current, previous) => {
    if (!previous) return { icon: Minus, color: 'text-slate-400', label: 'N/A' }
    const diff = current - previous
    if (diff > 0) return { icon: TrendingUp, color: 'text-success', label: `+${diff}` }
    if (diff < 0) return { icon: TrendingDown, color: 'text-danger', label: `${diff}` }
    return { icon: Minus, color: 'text-slate-400', label: '0' }
  }

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
                <span className="text-slate-600 capitalize">{entry.name}</span>
              </div>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading && page === 1) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="h-80 bg-slate-100 rounded-lg animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Health Score Breakdown */}
      {latestScore && (
        <Card>
          <CardHeader>
            <CardTitle>Current Health Score</CardTitle>
            <CardDescription>
              Last calculated: {new Date(latestScore.calculated_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {/* Overall Score with Risk Level */}
              <div className="col-span-2 md:col-span-1 flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                <HealthScoreGauge
                  label="Overall"
                  score={latestScore.overall_score}
                  size="lg"
                />
                {latestScore.risk_level && (
                  <Badge
                    variant={
                      latestScore.risk_level === 'low' ? 'success' :
                      latestScore.risk_level === 'medium' ? 'secondary' :
                      latestScore.risk_level === 'high' ? 'warning' : 'danger'
                    }
                    className="mt-2"
                  >
                    {latestScore.risk_level.toUpperCase()} Risk
                  </Badge>
                )}
              </div>

              {/* 5 Factor Scores per Specification */}
              <HealthScoreGauge
                label="Product Adoption"
                score={latestScore.product_adoption_score || latestScore.adoption_score || 0}
                weight={15}
                size="md"
              />
              <HealthScoreGauge
                label="Support Health"
                score={latestScore.support_health_score || latestScore.support_score || 0}
                weight={25}
                size="md"
              />
              <HealthScoreGauge
                label="Engagement"
                score={latestScore.engagement_score || 0}
                weight={20}
                size="md"
              />
              <HealthScoreGauge
                label="Financial"
                score={latestScore.financial_health_score || latestScore.financial_score || 0}
                weight={20}
                size="md"
              />
              <HealthScoreGauge
                label="SLA Compliance"
                score={latestScore.sla_compliance_score || 100}
                weight={20}
                size="md"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Score Trend Chart */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Health Score Trends</CardTitle>
            <CardDescription>Score history over time</CardDescription>
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
                onClick={() => {
                  setTimeRange(range.value)
                  setPage(1)
                }}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {chartData.length > 0 ? (
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
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    name="Overall"
                    stroke="#9C27B0"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="productAdoption"
                    name="Product Adoption (15%)"
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="supportHealth"
                    name="Support Health (25%)"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement (20%)"
                    stroke="#7C4DFF"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="financialHealth"
                    name="Financial Health (20%)"
                    stroke="#FF9800"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="slaCompliance"
                    name="SLA Compliance (20%)"
                    stroke="#FF5722"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No health score history available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Health Score History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Date
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        Overall
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        <span title="15% weight">Adoption</span>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        <span title="25% weight">Support</span>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        <span title="20% weight">Engage</span>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        <span title="20% weight">Financial</span>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        <span title="20% weight">SLA</span>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        Risk
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item, index) => {
                      const previousItem = history[index + 1]
                      const trend = getTrendInfo(item.overall_score, previousItem?.overall_score)
                      const TrendIcon = trend.icon

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 text-sm text-slate-600">
                            {new Date(item.calculated_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Badge variant={
                              item.overall_score >= 80 ? 'success' :
                              item.overall_score >= 60 ? 'secondary' :
                              item.overall_score >= 40 ? 'warning' : 'danger'
                            }>
                              {item.overall_score}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-slate-600">
                            {item.product_adoption_score || item.adoption_score || '-'}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-slate-600">
                            {item.support_health_score || item.support_score || '-'}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-slate-600">
                            {item.engagement_score || '-'}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-slate-600">
                            {item.financial_health_score || item.financial_score || '-'}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-slate-600">
                            {item.sla_compliance_score ?? '-'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {item.risk_level && (
                              <Badge variant={
                                item.risk_level === 'low' ? 'success' :
                                item.risk_level === 'medium' ? 'secondary' :
                                item.risk_level === 'high' ? 'warning' : 'danger'
                              } className="text-xs">
                                {item.risk_level}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className={`flex items-center justify-center gap-1 ${trend.color}`}>
                              <TrendIcon className="w-4 h-4" />
                              <span className="text-sm font-medium">{trend.label}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No health score history available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
