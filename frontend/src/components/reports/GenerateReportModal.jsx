import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsAPI, customersAPI, getAccessToken } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Activity,
  Star,
  Users,
  Briefcase,
} from 'lucide-react'

const reportTypes = [
  { value: 'health_summary', label: 'Health Summary Report', icon: Activity },
  { value: 'csat_analysis', label: 'CSAT Analysis Report', icon: Star },
  { value: 'customer_overview', label: 'Customer Overview Report', icon: Users },
  { value: 'executive_summary', label: 'Executive Summary Report', icon: Briefcase },
]

const reportSections = {
  health_summary: [
    { id: 'overview', label: 'Health Overview', default: true },
    { id: 'at_risk', label: 'At-Risk Customers', default: true },
    { id: 'trends', label: 'Health Trends', default: true },
    { id: 'recommendations', label: 'Recommendations', default: false },
  ],
  csat_analysis: [
    { id: 'scores', label: 'CSAT Scores Summary', default: true },
    { id: 'nps', label: 'NPS Breakdown', default: true },
    { id: 'trends', label: 'Score Trends', default: true },
    { id: 'feedback', label: 'Customer Feedback', default: true },
    { id: 'by_product', label: 'Scores by Product', default: false },
  ],
  customer_overview: [
    { id: 'profile', label: 'Customer Profile', default: true },
    { id: 'health', label: 'Health Score Details', default: true },
    { id: 'interactions', label: 'Recent Interactions', default: true },
    { id: 'alerts', label: 'Active Alerts', default: true },
    { id: 'csat', label: 'CSAT History', default: false },
  ],
  executive_summary: [
    { id: 'kpis', label: 'Key Performance Indicators', default: true },
    { id: 'alerts', label: 'Critical Alerts', default: true },
    { id: 'renewals', label: 'Upcoming Renewals', default: true },
    { id: 'at_risk', label: 'At-Risk Summary', default: true },
    { id: 'trends', label: 'Trend Analysis', default: false },
  ],
}

export function GenerateReportModal({
  open,
  onClose,
  initialType = '',
  initialCustomerId = '',
  onSuccess,
}) {
  const [reportType, setReportType] = useState(initialType)
  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSections, setSelectedSections] = useState([])
  const [generationStatus, setGenerationStatus] = useState('idle') // idle, generating, completed, failed
  const [progress, setProgress] = useState(0)
  const [generatedReport, setGeneratedReport] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
    enabled: open,
  })

  const customers = customersData?.customers || []

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setReportType(initialType || '')
      setCustomerId(initialCustomerId || '')
      setDateFrom('')
      setDateTo('')
      setGenerationStatus('idle')
      setProgress(0)
      setGeneratedReport(null)
      setDownloading(false)

      // Set default date range (last 30 days)
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      setDateTo(today.toISOString().split('T')[0])
      setDateFrom(thirtyDaysAgo.toISOString().split('T')[0])
    }
  }, [open, initialType, initialCustomerId])

  // Set default sections when report type changes
  useEffect(() => {
    if (reportType && reportSections[reportType]) {
      const defaults = reportSections[reportType]
        .filter(s => s.default)
        .map(s => s.id)
      setSelectedSections(defaults)
    }
  }, [reportType])

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      // Simulate progress for better UX
      setGenerationStatus('generating')
      setProgress(10)

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      try {
        const response = await reportsAPI.generate(data)
        clearInterval(progressInterval)
        setProgress(100)
        return response.data
      } catch (error) {
        clearInterval(progressInterval)
        throw error
      }
    },
    onSuccess: (data) => {
      setGenerationStatus('completed')
      setGeneratedReport(data)
      queryClient.invalidateQueries({ queryKey: ['report-history'] })
      onSuccess?.(data)
    },
    onError: () => {
      setGenerationStatus('failed')
      setProgress(0)
    },
  })

  const handleClose = () => {
    if (generationStatus !== 'generating') {
      onClose()
    }
  }

  const handleSectionToggle = (sectionId, checked) => {
    if (checked) {
      setSelectedSections(prev => [...prev, sectionId])
    } else {
      setSelectedSections(prev => prev.filter(id => id !== sectionId))
    }
  }

  const handleGenerate = () => {
    const data = {
      report_type: reportType,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      customer_id: customerId || undefined,
      sections: selectedSections,
    }

    generateMutation.mutate(data)
  }

  const handleDownload = async () => {
    if (!generatedReport?.id) return

    setDownloading(true)
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const downloadUrl = `${baseUrl}/reports/history/${generatedReport.id}/download`

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
      const fileName = generatedReport.file_path
        ? generatedReport.file_path.split(/[/\\]/).pop()
        : `report_${generatedReport.report_type}_${generatedReport.id}.pdf`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Download Complete', 'Your report has been downloaded.')
    } catch (error) {
      toast.error('Download Failed', error.message || 'Could not download the report.')
    } finally {
      setDownloading(false)
    }
  }

  const isCustomerReport = reportType === 'customer_overview'
  const currentSections = reportSections[reportType] || []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Report
          </DialogTitle>
        </DialogHeader>

        {/* Generation Status View */}
        {generationStatus !== 'idle' && (
          <div className="py-8">
            {generationStatus === 'generating' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                <div>
                  <p className="font-medium text-slate-800">Generating Report...</p>
                  <p className="text-sm text-slate-500">This may take a few moments</p>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-slate-400">{progress}% complete</p>
              </div>
            )}

            {generationStatus === 'completed' && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-success mx-auto" />
                <div>
                  <p className="font-medium text-slate-800">Report Generated Successfully!</p>
                  <p className="text-sm text-slate-500">Your report is ready to download</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleDownload} disabled={downloading} className="gap-2">
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {downloading ? 'Downloading...' : 'Download Report'}
                  </Button>
                  <Button variant="outline" onClick={handleClose} disabled={downloading}>
                    Close
                  </Button>
                </div>
              </div>
            )}

            {generationStatus === 'failed' && (
              <div className="text-center space-y-4">
                <XCircle className="w-12 h-12 text-danger mx-auto" />
                <div>
                  <p className="font-medium text-slate-800">Generation Failed</p>
                  <p className="text-sm text-slate-500">Something went wrong. Please try again.</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setGenerationStatus('idle')}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Form */}
        {generationStatus === 'idle' && (
          <>
            <div className="space-y-4">
              {/* Report Type */}
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Selection (for customer overview) */}
              {isCustomerReport && (
                <div className="space-y-2">
                  <Label>Customer <span className="text-danger">*</span></Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range */}
              {!isCustomerReport && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Sections Selection */}
              {currentSections.length > 0 && (
                <div className="space-y-2">
                  <Label>Include Sections</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {currentSections.map((section) => (
                      <div key={section.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`section-${section.id}`}
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={(checked) => handleSectionToggle(section.id, checked)}
                        />
                        <Label
                          htmlFor={`section-${section.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {section.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!reportType || (isCustomerReport && !customerId) || selectedSections.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Generate Report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
