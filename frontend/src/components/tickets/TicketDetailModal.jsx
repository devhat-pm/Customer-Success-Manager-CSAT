import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ticketsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Building,
  Calendar,
  Tag,
  FileText,
  ArrowRight,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineLoader } from '@/components/layout/LoadingSpinner'

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
}

const SLA_THRESHOLDS = {
  critical: 4,
  high: 8,
  medium: 24,
  low: 72,
}

export function TicketDetailModal({ open, onOpenChange, ticket, onUpdate }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [selectedStatus, setSelectedStatus] = useState(ticket?.status || 'open')

  const updateMutation = useMutation({
    mutationFn: (data) => ticketsAPI.update(ticket.id, data),
    onSuccess: () => {
      showToast('Ticket updated successfully', 'success')
      onUpdate?.()
      onOpenChange(false)
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to update ticket', 'error')
    },
  })

  const handleStatusUpdate = () => {
    if (selectedStatus !== ticket.status) {
      updateMutation.mutate({ status: selectedStatus })
    }
  }

  if (!ticket) return null

  const createdAt = new Date(ticket.created_at)
  const hoursOpen = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
  const slaThreshold = SLA_THRESHOLDS[ticket.priority]
  const slaPercentage = Math.min(100, (hoursOpen / slaThreshold) * 100)
  const isAtRisk = slaPercentage >= 80 && !ticket.sla_breached && ticket.status !== 'resolved' && ticket.status !== 'closed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono">
              {ticket.ticket_number}
            </Badge>
            <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority]}>
              {ticket.priority}
            </Badge>
            <Badge variant="outline" className={STATUS_COLORS[ticket.status]}>
              {ticket.status.replace('_', ' ')}
            </Badge>
          </div>
          <DialogTitle className="text-lg mt-2">{ticket.subject}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* SLA Status */}
          <div className={`p-4 rounded-lg ${ticket.sla_breached ? 'bg-red-50 border border-red-200' : isAtRisk ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {ticket.sla_breached ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700">SLA Breached</span>
                  </>
                ) : isAtRisk ? (
                  <>
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-700">SLA At Risk</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-700">Within SLA</span>
                  </>
                )}
              </div>
              <span className="text-sm text-slate-600">
                {slaThreshold}h threshold
              </span>
            </div>
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    ticket.sla_breached ? 'bg-red-500' : isAtRisk ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, slaPercentage)}%` }}
                />
              </div>
            )}
            {ticket.resolution_time_hours && (
              <p className="text-sm text-slate-600 mt-2">
                Resolved in {ticket.resolution_time_hours.toFixed(2)} hours
              </p>
            )}
          </div>

          {/* Ticket Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Building className="w-4 h-4" />
                Customer
              </div>
              <p className="font-medium">
                {ticket.customer ? (
                  <button
                    className="text-primary hover:underline"
                    onClick={() => {
                      onOpenChange(false)
                      navigate(`/customers/${ticket.customer_id}`)
                    }}
                  >
                    {ticket.customer.company_name}
                  </button>
                ) : 'Unknown'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Tag className="w-4 h-4" />
                Product
              </div>
              <p className="font-medium">{ticket.product}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                Created
              </div>
              <p className="font-medium">
                {format(createdAt, 'MMM d, yyyy h:mm a')}
                <span className="text-slate-500 text-sm ml-1">
                  ({formatDistanceToNow(createdAt, { addSuffix: true })})
                </span>
              </p>
            </div>
            {ticket.resolved_at && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 className="w-4 h-4" />
                  Resolved
                </div>
                <p className="font-medium">
                  {format(new Date(ticket.resolved_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {ticket.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileText className="w-4 h-4" />
                Description
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>
          )}

          <Separator />

          {/* Status Update */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status</label>
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                disabled={selectedStatus === ticket.status || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <InlineLoader className="w-4 h-4" />
                ) : (
                  <>
                    Update
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
            {selectedStatus === 'resolved' && ticket.status !== 'resolved' && (
              <p className="text-xs text-slate-500">
                Resolving will calculate the resolution time and check for SLA breach
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
