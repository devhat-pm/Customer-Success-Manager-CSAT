import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format, parseISO } from 'date-fns'
import {
  Download,
  Mail,
  FileText,
  Calendar,
  Activity,
  Star,
  Users,
  Briefcase,
  X,
  Send,
  Loader2,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'

const reportTypeIcons = {
  health_summary: Activity,
  csat_analysis: Star,
  customer_overview: Users,
  executive_summary: Briefcase,
}

const reportTypeLabels = {
  health_summary: 'Health Summary Report',
  csat_analysis: 'CSAT Analysis Report',
  customer_overview: 'Customer Overview Report',
  executive_summary: 'Executive Summary Report',
}

export function ReportPreviewModal({ open, onClose, report }) {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  if (!report) return null

  const TypeIcon = reportTypeIcons[report.report_type] || FileText

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy \'at\' h:mm a')
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

  const handleDownload = () => {
    if (report.download_url) {
      window.open(report.download_url, '_blank')
    }
  }

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return

    setIsSending(true)
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSending(false)
    setEmailSent(true)
    setTimeout(() => {
      setShowEmailForm(false)
      setEmailSent(false)
      setEmailTo('')
    }, 2000)
  }

  const handleClose = () => {
    setShowEmailForm(false)
    setEmailTo('')
    setEmailSent(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon className="w-5 h-5" />
              {reportTypeLabels[report.report_type] || 'Report Preview'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Report Info */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            {formatDate(report.created_at)}
          </div>
          <Badge variant="secondary">{formatFileSize(report.file_size)}</Badge>
          {report.triggered_by && (
            <Badge variant="secondary">
              {report.triggered_by === 'scheduled' ? 'Scheduled' : 'Manual'}
            </Badge>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 min-h-[400px] bg-slate-100 rounded-lg overflow-hidden relative">
          {report.preview_url ? (
            <iframe
              src={report.preview_url}
              className="w-full h-full border-0"
              title="Report Preview"
            />
          ) : report.download_url ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Preview not available for this report</p>
              <Button onClick={handleDownload} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500">Report preview unavailable</p>
            </div>
          )}
        </div>

        {/* Email Form (when shown) */}
        {showEmailForm && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            {emailSent ? (
              <div className="flex items-center gap-3 text-success">
                <CheckCircle className="w-5 h-5" />
                <span>Email sent successfully!</span>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="emailTo">Send report to</Label>
                  <Input
                    id="emailTo"
                    type="email"
                    placeholder="Enter email address..."
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSendEmail}
                  disabled={!emailTo.trim() || isSending}
                  className="gap-2"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowEmailForm(false)
                    setEmailTo('')
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {!showEmailForm && (
              <Button
                variant="outline"
                onClick={() => setShowEmailForm(true)}
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Report
              </Button>
            )}
            <Button onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Simple email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
