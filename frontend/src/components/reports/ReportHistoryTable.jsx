import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsAPI, getAccessToken } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format, parseISO } from 'date-fns'
import {
  MoreVertical,
  Download,
  Eye,
  Trash2,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  Activity,
  Star,
  Users,
  Briefcase,
  Search,
  X,
  Loader2,
} from 'lucide-react'

const reportTypeIcons = {
  health_summary: Activity,
  csat_analysis: Star,
  customer_overview: Users,
  executive_summary: Briefcase,
}

const reportTypeLabels = {
  health_summary: 'Health Summary',
  csat_analysis: 'CSAT Analysis',
  customer_overview: 'Customer Overview',
  executive_summary: 'Executive Summary',
}

const statusConfig = {
  completed: { label: 'Completed', icon: CheckCircle, variant: 'success' },
  failed: { label: 'Failed', icon: XCircle, variant: 'danger' },
  processing: { label: 'Processing', icon: Timer, variant: 'warning' },
}

const triggerLabels = {
  scheduled: 'Scheduled',
  manual: 'Manual',
}

export function ReportHistoryTable({
  reports,
  isLoading,
  filters,
  onFiltersChange,
  onPreview,
  total,
  page,
  limit,
  onPageChange,
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const deleteMutation = useMutation({
    mutationFn: (id) => reportsAPI.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-history'] })
      setDeleteConfirmOpen(false)
      setReportToDelete(null)
    },
  })

  const handleFilterChange = (key, value) => {
    onFiltersChange?.({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange?.({
      reportType: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  const handleDelete = (report) => {
    setReportToDelete(report)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteMutation.mutate(reportToDelete.id)
    }
  }

  const handleDownload = async (report) => {
    console.log('handleDownload called for report:', report.id, report)
    setDownloading(report.id)
    try {
      const token = getAccessToken()
      console.log('Token:', token ? 'exists' : 'missing')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const downloadUrl = `${baseUrl}/reports/history/${report.id}/download`

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Download failed: ${response.status} - ${text}`)
      }

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = report.file_path
        ? report.file_path.split(/[/\\]/).pop()
        : `report_${report.report_type}_${report.id}.pdf`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Download Complete', 'Your report has been downloaded.')
    } catch (error) {
      toast.error('Download Failed', error.message || 'Could not download the report.')
    } finally {
      setDownloading(null)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
    } catch {
      return '-'
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const activeFilterCount = [
    filters?.reportType,
    filters?.status,
    filters?.dateFrom,
    filters?.dateTo,
  ].filter(Boolean).length

  const totalPages = Math.ceil((total || 0) / limit)

  if (isLoading) {
    return <ReportHistoryTableSkeleton />
  }

  return (
    <>
      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Report Type Filter */}
            <Select
              value={filters?.reportType || 'all'}
              onValueChange={(v) => handleFilterChange('reportType', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(reportTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filters?.status || 'all'}
              onValueChange={(v) => handleFilterChange('status', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-[140px]"
                value={filters?.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                className="w-[140px]"
                value={filters?.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="w-4 h-4" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {!reports?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Reports Found</h3>
            <p className="text-slate-500">
              {activeFilterCount > 0
                ? 'Try adjusting your filters'
                : 'Generated reports will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Generated</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>File Size</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const TypeIcon = reportTypeIcons[report.report_type] || FileText
                  const status = statusConfig[report.status] || statusConfig.completed
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{formatDate(report.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">
                            {reportTypeLabels[report.report_type] || report.report_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {triggerLabels[report.triggered_by] || report.triggered_by}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatFileSize(report.file_size)}
                      </TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleDownload(report)}
                          disabled={downloading === report.id || report.status !== 'completed'}
                        >
                          {downloading === report.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Download className="w-4 h-4 mr-1" />
                          )}
                          Download
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {report.status === 'completed' && (
                              <>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    handleDownload(report)
                                  }}
                                >
                                  {downloading === report.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                  )}
                                  {downloading === report.id ? 'Downloading...' : 'Download'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onPreview?.(report)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onSelect={() => handleDelete(report)}
                              className="text-danger"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(page + 1)}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-danger hover:bg-danger/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ReportHistoryTableSkeleton() {
  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-[180px] bg-slate-200 rounded animate-pulse" />
            <div className="h-9 w-[140px] bg-slate-200 rounded animate-pulse" />
            <div className="h-9 w-[320px] bg-slate-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Generated</TableHead>
                <TableHead>Report Type</TableHead>
                <TableHead>Triggered By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-36 bg-slate-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" /></TableCell>
                  <TableCell><div className="h-5 w-24 bg-slate-200 rounded-full animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-slate-200 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-8 w-8 bg-slate-200 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
