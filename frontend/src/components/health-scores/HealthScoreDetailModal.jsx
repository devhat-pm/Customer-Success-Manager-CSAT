import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { customersAPI } from '@/services/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScoreGauge, MiniScoreGauge } from './ScoreGauge'
import { TrendBadge, CompactTrendIndicator } from './ScoreTrendIndicator'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  MessageSquare,
  Star,
  Zap,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Clock,
  ChevronRight,
} from 'lucide-react'

const statusConfig = {
  excellent: { color: 'success', label: 'Excellent', bg: 'bg-success/10' },
  good: { color: 'primary', label: 'Good', bg: 'bg-primary/10' },
  at_risk: { color: 'warning', label: 'At Risk', bg: 'bg-warning/10' },
  critical: { color: 'danger', label: 'Critical', bg: 'bg-danger/10' },
}

const factorConfig = {
  usage_score: { label: 'Usage', icon: Activity, description: 'Product usage and adoption' },
  engagement_score: { label: 'Engagement', icon: Users, description: 'User activity and interactions' },
  csat_score: { label: 'CSAT', icon: Star, description: 'Customer satisfaction ratings' },
  support_score: { label: 'Support', icon: MessageSquare, description: 'Support ticket trends' },
  adoption_score: { label: 'Adoption', icon: Zap, description: 'Feature adoption rate' },
}

export function HealthScoreDetailModal({ open, onClose, customer }) {
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch health history
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['customer-health-history', customer?.id],
    queryFn: () => customersAPI.getHealthHistory(customer.id, { limit: 30 }).then(res => res.data),
    enabled: !!customer?.id && open,
  })

  if (!customer) return null

  const score = customer.health_score || customer.latest_health_score?.overall_score || 0
  const scoreStatus = getScoreStatus(score)
  const config = statusConfig[scoreStatus]
  const history = healthData?.health_scores || healthData?.history || []

  // Map customer's health score factors from backend fields
  const scoreFactors = customer.score_factors || customer.latest_health_score ? {
    usage_score: customer.latest_health_score?.engagement_score || customer.score_factors?.usage_score || 0,
    engagement_score: customer.latest_health_score?.adoption_score || customer.score_factors?.engagement_score || 0,
    csat_score: customer.latest_health_score?.support_score || customer.score_factors?.csat_score || 0,
    support_score: customer.latest_health_score?.financial_score || customer.score_factors?.support_score || 0,
    adoption_score: customer.latest_health_score?.adoption_score || customer.score_factors?.adoption_score || 0,
  } : null

  // Prepare chart data
  const chartData = history
    .slice()
    .reverse()
    .map((h) => ({
      date: h.calculated_at ? format(parseISO(h.calculated_at), 'MMM d') : '',
      score: h.overall_score,
      usage: h.factors?.usage_score,
      engagement: h.factors?.engagement_score,
      csat: h.factors?.csat_score,
    }))

  const daysUntilRenewal = customer.contract_end_date
    ? Math.ceil((new Date(customer.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-lg font-bold">
                {customer.company_name?.charAt(0) || '?'}
              </div>
              <div>
                <DialogTitle className="text-xl">{customer.company_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={config.color}>{config.label}</Badge>
                  <TrendBadge trend={customer.score_trend} change={customer.score_change} />
                </div>
              </div>
            </div>
            <Link to={`/customers/${customer.id}?tab=health`}>
              <Button variant="outline" size="sm" className="gap-1">
                Full Details
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="factors">Factors</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Main Score */}
              <Card className="md:col-span-1">
                <CardContent className="p-6 flex flex-col items-center">
                  <ScoreGauge score={score} size="xl" showLabel={false} />
                  <p className="text-lg font-semibold text-slate-700 mt-2">Overall Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CompactTrendIndicator
                      trend={customer.score_trend}
                      change={customer.score_change}
                    />
                    <span className="text-sm text-slate-500">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              {/* Factor Scores */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Score Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {scoreFactors && Object.entries(scoreFactors)
                      .filter(([key]) => factorConfig[key])
                      .map(([key, value]) => {
                        const factorCfg = factorConfig[key]
                        const Icon = factorCfg.icon
                        return (
                          <div key={key} className="text-center">
                            <div className="flex justify-center mb-2">
                              <MiniScoreGauge score={value || 0} size="sm" />
                            </div>
                            <div className="flex items-center justify-center gap-1 text-sm font-medium text-slate-700">
                              <Icon className="w-3 h-3" />
                              {factorCfg.label}
                            </div>
                          </div>
                        )
                      })}
                    {!scoreFactors && (
                      <div className="col-span-3 text-center py-4 text-slate-500">
                        No factor data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Activity className={`w-4 h-4 text-${config.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="font-medium text-slate-800">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Clock className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Updated</p>
                      <p className="font-medium text-slate-800">
                        {history[0]?.calculated_at
                          ? format(parseISO(history[0].calculated_at), 'MMM d, yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${daysUntilRenewal <= 30 ? 'bg-warning/10' : 'bg-slate-100'}`}>
                      <Calendar className={`w-4 h-4 ${daysUntilRenewal <= 30 ? 'text-warning' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Renewal</p>
                      <p className={`font-medium ${daysUntilRenewal <= 30 ? 'text-warning' : 'text-slate-800'}`}>
                        {daysUntilRenewal !== null ? `${daysUntilRenewal} days` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Manager</p>
                      <p className="font-medium text-slate-800 truncate max-w-[100px]">
                        {customer.account_manager_name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mini Trend Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9C27B0" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#9C27B0" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                          }}
                        />
                        <ReferenceLine y={60} stroke="#FF9800" strokeDasharray="5 5" />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#9C27B0"
                          fill="url(#scoreGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Factors Tab */}
          <TabsContent value="factors" className="mt-4 space-y-4">
            {scoreFactors ? Object.entries(scoreFactors)
              .filter(([key]) => factorConfig[key])
              .map(([key, value]) => {
                const factorCfg = factorConfig[key]
                const Icon = factorCfg.icon
                const scoreValue = value || 0
                const scoreColor = scoreValue >= 80 ? 'success' : scoreValue >= 60 ? 'primary' : scoreValue >= 40 ? 'warning' : 'danger'

                return (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-${scoreColor}/10`}>
                          <Icon className={`w-5 h-5 text-${scoreColor}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-slate-800">{factorCfg.label}</h4>
                              <p className="text-xs text-slate-500">{factorCfg.description}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-2xl font-bold text-${scoreColor}`}>
                                {scoreValue}
                              </span>
                              <span className="text-slate-400">/100</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-${scoreColor} transition-all duration-500`}
                              style={{ width: `${scoreValue}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              }) : (
              <div className="text-center py-8 text-slate-500">
                No factor data available
              </div>
            )}

            {/* Recommendations */}
            {score < 80 && (
              <Card className="border-warning/50 bg-warning/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {(scoreFactors?.usage_score || 0) < 60 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        Schedule a product training session to improve usage adoption
                      </li>
                    )}
                    {(scoreFactors?.engagement_score || 0) < 60 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        Increase touchpoints with key stakeholders
                      </li>
                    )}
                    {(scoreFactors?.csat_score || 0) < 60 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        Review recent support tickets and address pain points
                      </li>
                    )}
                    {score < 60 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                        Consider escalating to leadership for intervention
                      </li>
                    )}
                    {!scoreFactors && score < 80 && (
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        Run health score calculation to get detailed recommendations
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-slate-500">Loading history...</p>
              </div>
            ) : chartData.length > 0 ? (
              <>
                {/* Full History Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94A3B8" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                            }}
                          />
                          <ReferenceLine y={80} stroke="#4CAF50" strokeDasharray="5 5" label="Excellent" />
                          <ReferenceLine y={60} stroke="#FF9800" strokeDasharray="5 5" label="At Risk" />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#9C27B0"
                            strokeWidth={2}
                            dot={{ fill: '#9C27B0', strokeWidth: 2 }}
                            name="Overall"
                          />
                          <Line
                            type="monotone"
                            dataKey="usage"
                            stroke="#2196F3"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Usage"
                          />
                          <Line
                            type="monotone"
                            dataKey="engagement"
                            stroke="#4CAF50"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Engagement"
                          />
                          <Line
                            type="monotone"
                            dataKey="csat"
                            stroke="#FF9800"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            name="CSAT"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* History Table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score Log</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-slate-50">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Date</th>
                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500">Score</th>
                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500">Change</th>
                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500">Usage</th>
                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500">Engagement</th>
                            <th className="text-center px-4 py-2 text-xs font-medium text-slate-500">CSAT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {history.map((h, idx) => {
                            const prevScore = history[idx + 1]?.overall_score
                            const change = prevScore !== undefined ? h.overall_score - prevScore : 0

                            return (
                              <tr key={h.id || idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-sm text-slate-600">
                                  {h.calculated_at ? format(parseISO(h.calculated_at), 'MMM d, yyyy') : '-'}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`font-medium ${getScoreColor(h.overall_score)}`}>
                                    {h.overall_score}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {change !== 0 && (
                                    <span className={`text-sm ${change > 0 ? 'text-success' : 'text-danger'}`}>
                                      {change > 0 ? '+' : ''}{change}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-center text-sm text-slate-600">
                                  {h.factors?.usage_score || '-'}
                                </td>
                                <td className="px-4 py-2 text-center text-sm text-slate-600">
                                  {h.factors?.engagement_score || '-'}
                                </td>
                                <td className="px-4 py-2 text-center text-sm text-slate-600">
                                  {h.factors?.csat_score || '-'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500">No history data available.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function getScoreStatus(score) {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'at_risk'
  return 'critical'
}

function getScoreColor(score) {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-primary'
  if (score >= 40) return 'text-warning'
  return 'text-danger'
}
