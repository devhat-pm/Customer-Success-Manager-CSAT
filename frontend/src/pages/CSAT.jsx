import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { csatAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoader } from '@/components/layout/LoadingSpinner'
import {
  CSATMetrics,
  CSATTrendChart,
  NPSBreakdownChart,
  CSATResponsesTable,
  CSATByProduct,
  SurveyLinkModal,
  ResponseDetailModal,
} from '@/components/csat'
import { Link2, Plus } from 'lucide-react'

export default function CSAT() {
  const [activeTab, setActiveTab] = useState('responses')
  const [surveyModalOpen, setSurveyModalOpen] = useState(false)
  const [responseModalOpen, setResponseModalOpen] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    customerId: '',
    product: '',
    surveyType: '',
    scoreRange: '',
    dateFrom: '',
    dateTo: '',
  })
  const limit = 10

  // Fetch analytics/metrics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['csat-analytics'],
    queryFn: () => csatAPI.getAnalytics().then(res => res.data),
  })

  // Fetch CSAT responses
  const { data: responsesData, isLoading: responsesLoading } = useQuery({
    queryKey: ['csat-responses', page, filters],
    queryFn: () => csatAPI.getAll({
      skip: (page - 1) * limit,
      limit,
      customer_id: filters.customerId || undefined,
      survey_type: filters.surveyType || undefined,
      search: filters.search || undefined,
    }).then(res => res.data),
  })

  // Fetch trend data
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['csat-trends'],
    queryFn: () => csatAPI.getAnalytics().then(res => res.data?.monthly_trend || []),
  })

  // Fetch by product data
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['csat-by-product'],
    queryFn: () => csatAPI.getAnalytics().then(res => res.data?.by_product || []),
  })

  const responses = responsesData?.surveys || []
  const total = responsesData?.total || 0

  // Transform analytics to metrics format
  const metrics = analytics ? {
    avg_csat: analytics.avg_csat || 0,
    csat_trend: analytics.csat_trend || 0,
    nps_score: analytics.nps_score ?? 0,
    nps_trend: analytics.nps_trend || 0,
    promoters_pct: analytics.promoters_pct || 0,
    passives_pct: analytics.passives_pct || 0,
    detractors_pct: analytics.detractors_pct || 0,
    total_responses: analytics.total_responses || total,
    last_month_responses: analytics.last_month_responses || 0,
    response_rate: analytics.response_rate || 0,
  } : null

  // NPS breakdown data
  const npsData = analytics ? {
    nps_score: analytics.nps_score ?? 0,
    promoters_count: analytics.promoters_count || 0,
    passives_count: analytics.passives_count || 0,
    detractors_count: analytics.detractors_count || 0,
  } : null

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  // Handle view response
  const handleViewResponse = (response) => {
    setSelectedResponse(response)
    setResponseModalOpen(true)
  }

  if (analyticsLoading && responsesLoading) {
    return <PageLoader text="Loading CSAT data..." />
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CSAT & Feedback</h1>
          <p className="text-slate-500">Customer satisfaction scores and feedback analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSurveyModalOpen(true)} className="gap-2">
            <Link2 className="w-4 h-4" />
            Create Survey Link
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Response
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <CSATMetrics data={metrics} isLoading={analyticsLoading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CSATTrendChart data={trendData} isLoading={trendLoading} />
        <NPSBreakdownChart data={npsData} isLoading={analyticsLoading} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="responses">All Responses</TabsTrigger>
          <TabsTrigger value="by-product">By Product</TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="mt-4">
          <CSATResponsesTable
            responses={responses}
            total={total}
            page={page}
            limit={limit}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onPageChange={setPage}
            onViewResponse={handleViewResponse}
            isLoading={responsesLoading}
          />
        </TabsContent>

        <TabsContent value="by-product" className="mt-4">
          <CSATByProduct data={productData} isLoading={productLoading} />
        </TabsContent>
      </Tabs>

      {/* Survey Link Modal */}
      <SurveyLinkModal
        open={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
      />

      {/* Response Detail Modal */}
      <ResponseDetailModal
        open={responseModalOpen}
        onClose={() => {
          setResponseModalOpen(false)
          setSelectedResponse(null)
        }}
        response={selectedResponse}
      />
    </div>
  )
}
