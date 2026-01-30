import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { alertsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/layout/LoadingSpinner'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertStatsCards,
  AlertFilters,
  AlertCard,
  AlertCardSkeleton,
  AlertDetailModal,
  ResolveAlertModal,
  BulkResolveModal,
  SnoozeAlertModal,
  BulkSnoozeModal,
  CreateAlertModal,
} from '@/components/alerts'
import {
  Plus,
  CheckCircle,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react'

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const limit = 10

  // Parse URL params for filters
  const initialFilters = {
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    severity: searchParams.get('severity') || '',
    type: searchParams.get('type') || '',
    customerId: searchParams.get('customerId') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  }

  const [filters, setFilters] = useState(initialFilters)

  // Selection state for bulk actions
  const [selectedAlerts, setSelectedAlerts] = useState([])
  const [selectAll, setSelectAll] = useState(false)

  // Modal states
  const [detailModalAlert, setDetailModalAlert] = useState(null)
  const [resolveModalAlert, setResolveModalAlert] = useState(null)
  const [snoozeModalAlert, setSnoozeModalAlert] = useState(null)
  const [bulkResolveOpen, setBulkResolveOpen] = useState(false)
  const [bulkSnoozeOpen, setBulkSnoozeOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Fetch alert stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: () => alertsAPI.getStats().then(res => res.data),
  })

  // Transform stats for component
  // Backend returns by_severity as {critical: {total, unresolved}, ...}
  const stats = statsData ? {
    critical: statsData.critical || statsData.by_severity?.critical?.unresolved || 0,
    high: statsData.high || statsData.by_severity?.high?.unresolved || 0,
    medium: statsData.medium || statsData.by_severity?.medium?.unresolved || 0,
    low: statsData.low || statsData.by_severity?.low?.unresolved || 0,
  } : null

  // Build query params for API
  const buildQueryParams = () => {
    const params = {
      skip: (page - 1) * limit,
      limit,
    }

    if (filters.search) params.search = filters.search
    if (filters.severity) params.severity = filters.severity
    if (filters.type) params.alert_type = filters.type
    if (filters.customerId) params.customer_id = filters.customerId
    if (filters.dateFrom) params.date_from = filters.dateFrom
    if (filters.dateTo) params.date_to = filters.dateTo

    // Handle status filter
    if (filters.status === 'active') {
      params.is_resolved = false
      params.is_snoozed = false
    } else if (filters.status === 'resolved') {
      params.is_resolved = true
    } else if (filters.status === 'snoozed') {
      params.is_snoozed = true
    }

    return params
  }

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', page, filters],
    queryFn: () => alertsAPI.getAll(buildQueryParams()).then(res => res.data),
  })

  const alerts = alertsData?.alerts || []
  const total = alertsData?.total || 0
  const totalPages = Math.ceil(total / limit)

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)
    setSelectedAlerts([])
    setSelectAll(false)

    // Update URL params
    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.status) params.set('status', newFilters.status)
    if (newFilters.severity) params.set('severity', newFilters.severity)
    if (newFilters.type) params.set('type', newFilters.type)
    if (newFilters.customerId) params.set('customerId', newFilters.customerId)
    if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom)
    if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo)
    setSearchParams(params)
  }, [setSearchParams])

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      severity: '',
      type: '',
      customerId: '',
      dateFrom: '',
      dateTo: '',
    }
    setFilters(clearedFilters)
    setPage(1)
    setSelectedAlerts([])
    setSelectAll(false)
    setSearchParams(new URLSearchParams())
  }

  // Filter by severity from stats cards
  const handleFilterBySeverity = (severity) => {
    handleFiltersChange({ ...filters, severity, status: 'active' })
  }

  // Selection handlers
  const handleSelectAlert = (alertId, checked) => {
    if (checked) {
      setSelectedAlerts(prev => [...prev, alertId])
    } else {
      setSelectedAlerts(prev => prev.filter(id => id !== alertId))
      setSelectAll(false)
    }
  }

  const handleSelectAll = (checked) => {
    setSelectAll(checked)
    if (checked) {
      const unresolvedAlerts = alerts.filter(a => !a.is_resolved && !a.status?.includes('resolved'))
      setSelectedAlerts(unresolvedAlerts.map(a => a.id))
    } else {
      setSelectedAlerts([])
    }
  }

  // Get selected alert objects for bulk modals
  const getSelectedAlertObjects = () => {
    return alerts.filter(a => selectedAlerts.includes(a.id))
  }

  // Clear selection after bulk action
  const handleBulkActionSuccess = () => {
    setSelectedAlerts([])
    setSelectAll(false)
  }

  // Modal handlers
  const handleViewDetails = (alert) => {
    setDetailModalAlert(alert)
  }

  const handleResolve = (alert) => {
    setDetailModalAlert(null)
    setResolveModalAlert(alert)
  }

  const handleSnooze = (alert) => {
    setDetailModalAlert(null)
    setSnoozeModalAlert(alert)
  }

  if (statsLoading && alertsLoading) {
    return <PageLoader text="Loading alerts..." />
  }

  const hasSelectedAlerts = selectedAlerts.length > 0
  const unresolvedAlerts = alerts.filter(a => !a.is_resolved && a.status !== 'resolved')

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alerts</h1>
          <p className="text-slate-500">Monitor and manage customer alerts</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Alert
        </Button>
      </div>

      {/* Stats Cards */}
      <AlertStatsCards
        stats={stats}
        isLoading={statsLoading}
        onFilterBySeverity={handleFilterBySeverity}
      />

      {/* Filters */}
      <AlertFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {/* Bulk Actions Bar */}
      {hasSelectedAlerts && (
        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium text-slate-700">
            {selectedAlerts.length} alert{selectedAlerts.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkResolveOpen(true)}
              className="gap-1"
            >
              <CheckCircle className="w-4 h-4 text-success" />
              Resolve Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkSnoozeOpen(true)}
              className="gap-1"
            >
              <BellOff className="w-4 h-4" />
              Snooze Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAlerts([])
                setSelectAll(false)
              }}
              className="text-slate-500"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {/* List Header with Select All */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {unresolvedAlerts.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-500">Select all</span>
              </div>
            )}
            <p className="text-sm text-slate-500">
              {alertsLoading ? 'Loading...' : `${total} alert${total !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>

        {/* Alert Cards */}
        {alertsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <AlertCardSkeleton key={i} />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-lg">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No alerts found</h3>
            <p className="text-slate-500 mb-4">
              {Object.values(filters).some(Boolean)
                ? 'Try adjusting your filters'
                : 'You\'re all caught up! No active alerts at the moment.'}
            </p>
            {Object.values(filters).some(Boolean) && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResolve={handleResolve}
                onSnooze={handleSnooze}
                onViewDetails={handleViewDetails}
                onSelect={handleSelectAlert}
                isSelected={selectedAlerts.includes(alert.id)}
                showCheckbox={!alert.is_resolved && alert.status !== 'resolved'}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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
              <span className="text-sm text-slate-600 px-2">
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
      </div>

      {/* Modals */}
      <AlertDetailModal
        open={!!detailModalAlert}
        onClose={() => setDetailModalAlert(null)}
        alert={detailModalAlert}
        onResolve={handleResolve}
        onSnooze={handleSnooze}
      />

      <ResolveAlertModal
        open={!!resolveModalAlert}
        onClose={() => setResolveModalAlert(null)}
        alert={resolveModalAlert}
        onSuccess={() => setResolveModalAlert(null)}
      />

      <SnoozeAlertModal
        open={!!snoozeModalAlert}
        onClose={() => setSnoozeModalAlert(null)}
        alert={snoozeModalAlert}
        onSuccess={() => setSnoozeModalAlert(null)}
      />

      <BulkResolveModal
        open={bulkResolveOpen}
        onClose={() => setBulkResolveOpen(false)}
        alerts={getSelectedAlertObjects()}
        onSuccess={handleBulkActionSuccess}
      />

      <BulkSnoozeModal
        open={bulkSnoozeOpen}
        onClose={() => setBulkSnoozeOpen(false)}
        alerts={getSelectedAlertObjects()}
        onSuccess={handleBulkActionSuccess}
      />

      <CreateAlertModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
