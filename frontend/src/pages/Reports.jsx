import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { reportsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoader } from '@/components/layout/LoadingSpinner'
import { useToast } from '@/contexts/ToastContext'
import {
  QuickReportCard,
  QuickReportCardSkeleton,
  GenerateReportModal,
  ScheduledReportsTable,
  ScheduleReportModal,
  ReportHistoryTable,
  ReportPreviewModal,
} from '@/components/reports'
import {
  Plus,
  Calendar,
  Activity,
  Star,
  Users,
  Briefcase,
} from 'lucide-react'

const quickReports = [
  {
    type: 'health_summary',
    title: 'Health Summary Report',
    description: 'Overall health distribution, at-risk customers, and trends',
    icon: Activity,
    requiresCustomer: false,
  },
  {
    type: 'csat_analysis',
    title: 'CSAT Analysis Report',
    description: 'CSAT scores, NPS breakdown, and feedback analysis',
    icon: Star,
    requiresCustomer: false,
  },
  {
    type: 'customer_overview',
    title: 'Customer Overview Report',
    description: 'Comprehensive report for a specific customer',
    icon: Users,
    requiresCustomer: true,
  },
  {
    type: 'executive_summary',
    title: 'Executive Summary Report',
    description: 'Key metrics, critical alerts, and upcoming renewals',
    icon: Briefcase,
    requiresCustomer: false,
  },
]

export default function Reports({ openGenerateModal = false }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('quick')
  const { toast } = useToast()

  // Modal states
  const [generateModalOpen, setGenerateModalOpen] = useState(openGenerateModal)

  // Open modal if navigated to /reports/new
  useEffect(() => {
    if (openGenerateModal) {
      setGenerateModalOpen(true)
    }
  }, [openGenerateModal])
  const [generateModalType, setGenerateModalType] = useState('')
  const [generateModalCustomerId, setGenerateModalCustomerId] = useState('')
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [previewReport, setPreviewReport] = useState(null)

  // Generating state for quick report cards
  const [generatingType, setGeneratingType] = useState(null)

  // History filters and pagination
  const [historyPage, setHistoryPage] = useState(1)
  const [historyFilters, setHistoryFilters] = useState({
    reportType: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })
  const historyLimit = 10

  // Fetch last generated dates for quick reports
  const { data: lastGeneratedData } = useQuery({
    queryKey: ['reports-last-generated'],
    queryFn: () => reportsAPI.getLastGenerated?.().then(res => res.data).catch(() => ({})),
  })

  // Fetch scheduled reports
  const { data: scheduledData, isLoading: scheduledLoading } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: () => reportsAPI.getScheduled().then(res => res.data),
  })

  // Fetch report history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['report-history', historyPage, historyFilters],
    queryFn: () => reportsAPI.getHistory({
      skip: (historyPage - 1) * historyLimit,
      limit: historyLimit,
      report_type: historyFilters.reportType || undefined,
      status: historyFilters.status || undefined,
      date_from: historyFilters.dateFrom || undefined,
      date_to: historyFilters.dateTo || undefined,
    }).then(res => res.data),
  })

  const schedules = scheduledData?.reports || scheduledData?.schedules || []
  const historyReports = historyData?.history || historyData?.reports || []
  const historyTotal = historyData?.total || 0

  // Handle quick report generation
  const handleQuickGenerate = (type, customerId = null) => {
    setGenerateModalType(type)
    setGenerateModalCustomerId(customerId || '')
    setGenerateModalOpen(true)
  }

  // Handle generate modal success
  const handleGenerateSuccess = (data) => {
    toast.success('Report Generated', 'Your report has been generated successfully.')
    setGeneratingType(null)
  }

  // Handle schedule edit
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule)
    setScheduleModalOpen(true)
  }

  // Handle schedule modal close
  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false)
    setEditingSchedule(null)
  }

  // Handle schedule save success
  const handleScheduleSuccess = () => {
    toast.success(
      editingSchedule ? 'Schedule Updated' : 'Schedule Created',
      editingSchedule
        ? 'The scheduled report has been updated.'
        : 'The scheduled report has been created.'
    )
    handleScheduleModalClose()
  }

  // Handle run now success
  const handleRunNowSuccess = () => {
    toast.success('Report Triggered', 'The report is being generated and will be sent to recipients.')
  }

  // Handle history filter changes
  const handleHistoryFiltersChange = useCallback((newFilters) => {
    setHistoryFilters(newFilters)
    setHistoryPage(1)
  }, [])

  // Handle preview
  const handlePreview = (report) => {
    setPreviewReport(report)
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500">Generate and manage customer success reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingSchedule(null)
              setScheduleModalOpen(true)
            }}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Create Schedule
          </Button>
          <Button
            onClick={() => {
              setGenerateModalType('')
              setGenerateModalCustomerId('')
              setGenerateModalOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="quick">Quick Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        {/* Quick Reports Tab */}
        <TabsContent value="quick" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickReports.map((report) => (
              <QuickReportCard
                key={report.type}
                type={report.type}
                title={report.title}
                description={report.description}
                lastGenerated={lastGeneratedData?.[report.type]}
                onGenerate={handleQuickGenerate}
                isGenerating={generatingType === report.type}
                requiresCustomer={report.requiresCustomer}
              />
            ))}
          </div>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <ScheduledReportsTable
            schedules={schedules}
            isLoading={scheduledLoading}
            onEdit={handleEditSchedule}
            onRunNow={handleRunNowSuccess}
          />
        </TabsContent>

        {/* Report History Tab */}
        <TabsContent value="history" className="space-y-6">
          <ReportHistoryTable
            reports={historyReports}
            isLoading={historyLoading}
            filters={historyFilters}
            onFiltersChange={handleHistoryFiltersChange}
            onPreview={handlePreview}
            total={historyTotal}
            page={historyPage}
            limit={historyLimit}
            onPageChange={setHistoryPage}
          />
        </TabsContent>
      </Tabs>

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={generateModalOpen}
        onClose={() => {
          setGenerateModalOpen(false)
          if (openGenerateModal) {
            navigate('/reports')
          }
        }}
        initialType={generateModalType}
        initialCustomerId={generateModalCustomerId}
        onSuccess={handleGenerateSuccess}
      />

      {/* Schedule Report Modal */}
      <ScheduleReportModal
        open={scheduleModalOpen}
        onClose={handleScheduleModalClose}
        schedule={editingSchedule}
        onSuccess={handleScheduleSuccess}
      />

      {/* Report Preview Modal */}
      <ReportPreviewModal
        open={!!previewReport}
        onClose={() => setPreviewReport(null)}
        report={previewReport}
      />
    </div>
  )
}
