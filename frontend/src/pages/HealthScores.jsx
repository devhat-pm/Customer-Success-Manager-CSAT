import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { customersAPI, healthScoresAPI, dashboardAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/layout/LoadingSpinner'
import { useToast } from '@/contexts/ToastContext'
import { generateHealthScoresPDF } from '@/lib/pdfExport'
import {
  HealthScoreOverviewCards,
  HealthScoreFilters,
  HealthScoreFiltersCompact,
  HealthScoreGrid,
  HealthScoreTable,
  HealthScoreDetailModal,
  AtRiskCustomersSection,
  ScoreDistributionChart,
} from '@/components/health-scores'
import {
  LayoutGrid,
  List,
  RefreshCw,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

export default function HealthScores() {
  const { toast } = useToast()
  const chartRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'table'
  const [showFilters, setShowFilters] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Parse URL params for filters
  const initialFilters = {
    minScore: parseInt(searchParams.get('minScore')) || 0,
    maxScore: parseInt(searchParams.get('maxScore')) || 100,
    trend: searchParams.get('trend') || '',
    status: searchParams.get('status') || '',
    product: searchParams.get('product') || '',
    accountManagerId: searchParams.get('accountManagerId') || '',
  }

  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('health_score')
  const [sortOrder, setSortOrder] = useState('asc')
  const limit = viewMode === 'grid' ? 12 : 10

  // Fetch overview stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['health-scores-stats'],
    queryFn: () => dashboardAPI.getHealthDistribution().then(res => res.data),
  })

  // Transform stats data
  const stats = statsData ? {
    avg_score: statsData.average_score || 0,
    total_customers: (statsData.excellent?.count || 0) + (statsData.good?.count || 0) +
                     (statsData.at_risk?.count || 0) + (statsData.critical?.count || 0),
    by_status: {
      excellent: statsData.excellent || { count: 0, percentage: 0 },
      good: statsData.good || { count: 0, percentage: 0 },
      at_risk: statsData.at_risk || { count: 0, percentage: 0 },
      critical: statsData.critical || { count: 0, percentage: 0 },
    }
  } : null

  // Fetch customers with health scores
  const { data: customersData, isLoading: customersLoading, refetch } = useQuery({
    queryKey: ['health-scores-customers', page, filters, sortBy, sortOrder, limit],
    queryFn: () => customersAPI.getAll({
      skip: (page - 1) * limit,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
      status: filters.status || undefined,
      account_manager_id: filters.accountManagerId || undefined,
      min_health_score: filters.minScore > 0 ? filters.minScore : undefined,
      max_health_score: filters.maxScore < 100 ? filters.maxScore : undefined,
    }).then(res => res.data),
  })

  // Transform customers to flatten health_score from latest_health_score
  const customers = (customersData?.customers || []).map(c => ({
    ...c,
    health_score: c.latest_health_score?.overall_score ?? c.health_score ?? 0,
    score_trend: c.latest_health_score?.score_trend ?? c.score_trend ?? null,
  }))
  const total = customersData?.total || 0

  // Filter customers by trend (client-side since backend may not support)
  const filteredCustomers = filters.trend
    ? customers.filter((c) => c.score_trend === filters.trend)
    : customers

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)

    // Update URL params
    const params = new URLSearchParams()
    if (newFilters.minScore > 0) params.set('minScore', newFilters.minScore)
    if (newFilters.maxScore < 100) params.set('maxScore', newFilters.maxScore)
    if (newFilters.trend) params.set('trend', newFilters.trend)
    if (newFilters.status) params.set('status', newFilters.status)
    if (newFilters.product) params.set('product', newFilters.product)
    if (newFilters.accountManagerId) params.set('accountManagerId', newFilters.accountManagerId)
    setSearchParams(params)
  }, [setSearchParams])

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      minScore: 0,
      maxScore: 100,
      trend: '',
      status: '',
      product: '',
      accountManagerId: '',
    }
    setFilters(clearedFilters)
    setPage(1)
    setSearchParams(new URLSearchParams())
  }

  // Handle sort
  const handleSort = (column, order) => {
    setSortBy(column)
    setSortOrder(order)
    setPage(1)
  }

  // Handle view details
  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer)
    setDetailModalOpen(true)
  }

  // Handle segment click from chart
  const handleSegmentClick = (range) => {
    handleFiltersChange({
      ...filters,
      minScore: range.minScore,
      maxScore: range.maxScore,
    })
  }

  // Calculate recalculate all scores
  const handleRecalculate = async () => {
    try {
      toast.info('Recalculating', 'Starting health score calculation...')
      await healthScoresAPI.calculateAll()
      refetch()
      toast.success('Complete', 'Health scores have been recalculated.')
    } catch (error) {
      console.error('Failed to recalculate scores:', error)
      toast.error('Error', 'Failed to recalculate scores. Please try again.')
    }
  }

  // Export to PDF
  const handleExport = async () => {
    setIsExporting(true)
    try {
      toast.info('Generating PDF', 'Please wait while we generate your report...')

      // Fetch all customers for the report (up to 1000)
      const allCustomersData = await customersAPI.getAll({
        limit: 1000,
        sort_by: 'health_score',
        sort_order: 'asc',
      }).then(res => res.data)

      const allCustomers = (allCustomersData?.customers || []).map(c => ({
        ...c,
        health_score: c.latest_health_score?.overall_score ?? c.health_score ?? 0,
        score_trend: c.latest_health_score?.score_trend ?? c.score_trend ?? null,
      }))

      const exportData = {
        stats,
        customers: allCustomers,
      }

      await generateHealthScoresPDF(exportData, {
        title: 'Health Scores Report',
        companyName: 'Success Manager',
        includeCharts: true,
        chartElement: chartRef.current,
      })

      toast.success('Export Complete', 'Your PDF report has been downloaded.')
    } catch (error) {
      console.error('Failed to export PDF:', error)
      toast.error('Export Failed', 'Failed to generate PDF report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (statsLoading && customersLoading) {
    return <PageLoader text="Loading health scores..." />
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Health Scores</h1>
          <p className="text-slate-500">Monitor and analyze customer health across your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRecalculate} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Recalculate
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <HealthScoreOverviewCards stats={stats} isLoading={statsLoading} />

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-64 flex-shrink-0">
            <HealthScoreFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClear={handleClearFilters}
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-slate-100' : ''}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              {!showFilters && (
                <HealthScoreFiltersCompact
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClear={handleClearFilters}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500 mr-2">
                {customersLoading ? 'Loading...' : `${total} customer${total !== 1 ? 's' : ''}`}
              </p>
              <div className="flex items-center border border-slate-200 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Grid or Table View */}
          {viewMode === 'grid' ? (
            <>
              <HealthScoreGrid
                customers={filteredCustomers}
                onViewDetails={handleViewDetails}
                isLoading={customersLoading}
              />
              {/* Grid Pagination */}
              {total > limit && (
                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {Math.ceil(total / limit)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(total / limit)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <HealthScoreTable
              customers={filteredCustomers}
              total={total}
              page={page}
              limit={limit}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onPageChange={setPage}
              onViewDetails={handleViewDetails}
              isLoading={customersLoading}
            />
          )}
        </div>
      </div>

      {/* Bottom Section - At Risk & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AtRiskCustomersSection
          customers={customers}
          onViewDetails={handleViewDetails}
          isLoading={customersLoading}
          limit={5}
        />
        <div ref={chartRef}>
          <ScoreDistributionChart
            customers={customers}
            isLoading={customersLoading}
            onSegmentClick={handleSegmentClick}
          />
        </div>
      </div>

      {/* Detail Modal */}
      <HealthScoreDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedCustomer(null)
        }}
        customer={selectedCustomer}
      />
    </div>
  )
}
