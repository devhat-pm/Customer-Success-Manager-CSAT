import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { interactionsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/layout/LoadingSpinner'
import {
  InteractionMetrics,
  InteractionFilters,
  InteractionsTable,
  InteractionsTimeline,
  LogInteractionModal,
  PendingFollowups,
} from '@/components/interactions'
import {
  Plus,
  List,
  Clock,
} from 'lucide-react'

export default function Interactions({ openNewModal = false }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState('list') // 'list' or 'timeline'
  const [logModalOpen, setLogModalOpen] = useState(openNewModal)

  // Open modal if navigated to /interactions/new
  useEffect(() => {
    if (openNewModal) {
      setLogModalOpen(true)
    }
  }, [openNewModal])
  const [editingInteraction, setEditingInteraction] = useState(null)
  const [selectedInteraction, setSelectedInteraction] = useState(null)
  const [page, setPage] = useState(1)
  const limit = 10

  // Parse URL params for filters
  const initialFilters = {
    search: searchParams.get('search') || '',
    customerId: searchParams.get('customerId') || '',
    type: searchParams.get('type') || '',
    sentiment: searchParams.get('sentiment') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    followupRequired: searchParams.get('followupRequired') === 'true',
  }

  const [filters, setFilters] = useState(initialFilters)

  // Fetch interactions summary/metrics
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['interactions-summary'],
    queryFn: () => interactionsAPI.getSummary().then(res => res.data),
  })

  // Fetch interactions
  const { data: interactionsData, isLoading: interactionsLoading } = useQuery({
    queryKey: ['interactions', page, filters],
    queryFn: () => interactionsAPI.getAll({
      skip: (page - 1) * limit,
      limit,
      customer_id: filters.customerId || undefined,
      interaction_type: filters.type || undefined,
      sentiment: filters.sentiment || undefined,
      performed_by: filters.search || undefined,
      start_date: filters.dateFrom || undefined,
      end_date: filters.dateTo || undefined,
      follow_up_required: filters.followupRequired || undefined,
    }).then(res => res.data),
  })

  // Fetch pending follow-ups
  const { data: pendingFollowupsData, isLoading: followupsLoading } = useQuery({
    queryKey: ['pending-followups'],
    queryFn: () => interactionsAPI.getPendingFollowups({ limit: 10 }).then(res => res.data),
  })

  const interactions = interactionsData?.interactions || []
  const total = interactionsData?.total || 0
  const pendingFollowups = pendingFollowupsData?.followups || []

  // Transform summary to metrics format
  const metrics = summary ? {
    total_interactions: summary.total || total,
    last_month_interactions: summary.last_month || 0,
    meetings_this_week: summary.meetings_this_week || summary.this_week || 0,
    pending_followups: summary.pending_followups || pendingFollowups.length,
    overdue_followups: summary.overdue_followups || 0,
    negative_sentiment_count: summary.negative_count || 0,
  } : null

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)

    // Update URL params
    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.customerId) params.set('customerId', newFilters.customerId)
    if (newFilters.type) params.set('type', newFilters.type)
    if (newFilters.sentiment) params.set('sentiment', newFilters.sentiment)
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom)
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo)
    if (newFilters.followupRequired) params.set('followupRequired', 'true')
    setSearchParams(params)
  }, [setSearchParams])

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      customerId: '',
      type: '',
      sentiment: '',
      dateFrom: '',
      dateTo: '',
      followupRequired: false,
    }
    setFilters(clearedFilters)
    setPage(1)
    setSearchParams(new URLSearchParams())
  }

  // Handle view interaction
  const handleViewInteraction = (interaction) => {
    setSelectedInteraction(interaction)
    // Could open a detail modal here
  }

  // Handle edit interaction
  const handleEditInteraction = (interaction) => {
    setEditingInteraction(interaction)
    setLogModalOpen(true)
  }

  // Handle modal close
  const handleCloseModal = () => {
    setLogModalOpen(false)
    setEditingInteraction(null)
    // Navigate back to /interactions if we came from /interactions/new
    if (openNewModal) {
      navigate('/interactions')
    }
  }

  if (summaryLoading && interactionsLoading) {
    return <PageLoader text="Loading interactions..." />
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Interactions</h1>
          <p className="text-slate-500">Track and manage customer communications</p>
        </div>
        <Button onClick={() => setLogModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Log Interaction
        </Button>
      </div>

      {/* Metrics Row */}
      <InteractionMetrics data={metrics} isLoading={summaryLoading} />

      {/* Filters */}
      <InteractionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactions List/Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {interactionsLoading ? 'Loading...' : `${total} interaction${total !== 1 ? 's' : ''} found`}
            </p>
            <div className="flex items-center border border-slate-200 rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none gap-1"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none gap-1"
                onClick={() => setViewMode('timeline')}
              >
                <Clock className="w-4 h-4" />
                Timeline
              </Button>
            </div>
          </div>

          {/* Content */}
          {viewMode === 'list' ? (
            <InteractionsTable
              interactions={interactions}
              total={total}
              page={page}
              limit={limit}
              onPageChange={setPage}
              onViewInteraction={handleViewInteraction}
              onEditInteraction={handleEditInteraction}
              isLoading={interactionsLoading}
            />
          ) : (
            <InteractionsTimeline
              interactions={interactions}
              onViewInteraction={handleViewInteraction}
              isLoading={interactionsLoading}
            />
          )}
        </div>

        {/* Pending Follow-ups Sidebar */}
        <div className="lg:col-span-1">
          <PendingFollowups
            interactions={pendingFollowups}
            isLoading={followupsLoading}
            limit={5}
            onViewInteraction={handleViewInteraction}
          />
        </div>
      </div>

      {/* Log/Edit Interaction Modal */}
      <LogInteractionModal
        open={logModalOpen}
        onClose={handleCloseModal}
        interaction={editingInteraction}
      />
    </div>
  )
}
