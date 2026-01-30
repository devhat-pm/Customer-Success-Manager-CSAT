import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  MessageSquare,
  Send,
  Lock,
  Eye,
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InlineLoader } from '@/components/layout/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'

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
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState(ticket?.status || 'open')
  const [activeTab, setActiveTab] = useState('details')
  const [commentText, setCommentText] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  // Reset state when ticket changes
  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status)
      setCommentText('')
      setIsInternal(false)
    }
  }, [ticket?.id])

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['ticket-comments', ticket?.id],
    queryFn: () => ticketsAPI.getComments(ticket.id).then(res => res.data),
    enabled: !!ticket?.id && open,
  })

  const comments = commentsData?.comments || []

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

  const addCommentMutation = useMutation({
    mutationFn: (data) => ticketsAPI.addComment(ticket.id, data),
    onSuccess: () => {
      showToast('Comment added successfully', 'success')
      setCommentText('')
      queryClient.invalidateQueries(['ticket-comments', ticket.id])
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to add comment', 'error')
    },
  })

  const handleStatusUpdate = () => {
    if (selectedStatus !== ticket.status) {
      updateMutation.mutate({ status: selectedStatus })
    }
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    addCommentMutation.mutate({
      comment_text: commentText,
      is_internal: isInternal,
    })
  }

  if (!ticket) return null

  const createdAt = new Date(ticket.created_at)
  const hoursOpen = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
  const slaThreshold = SLA_THRESHOLDS[ticket.priority]
  const slaPercentage = Math.min(100, (hoursOpen / slaThreshold) * 100)
  const isAtRisk = slaPercentage >= 80 && !ticket.sla_breached && ticket.status !== 'resolved' && ticket.status !== 'closed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              Comments
              {comments.length > 0 && (
                <span className="bg-primary/10 text-primary text-xs px-1.5 rounded-full">
                  {comments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto space-y-4 mt-4">
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
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] mb-4">
              {commentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No comments yet</p>
                  <p className="text-xs">Add a comment below to start the conversation</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {comment.author_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {comment.author_name || 'Unknown'}
                        </span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-1 bg-amber-50 text-amber-700 border-amber-200">
                            <Lock className="w-2.5 h-2.5" />
                            Internal
                          </Badge>
                        )}
                        {!comment.is_internal && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 gap-1 bg-blue-50 text-blue-700 border-blue-200">
                            <Eye className="w-2.5 h-2.5" />
                            Customer visible
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400">
                          {comment.created_at && formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className={`p-3 rounded-lg text-sm ${comment.is_internal ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                        {comment.comment_text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="border-t pt-4 space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternal}
                    onCheckedChange={setIsInternal}
                  />
                  <label htmlFor="internal" className="text-sm text-slate-600 flex items-center gap-1 cursor-pointer">
                    <Lock className="w-3 h-3" />
                    Internal note (not visible to customer)
                  </label>
                </div>
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="gap-2"
                >
                  {addCommentMutation.isPending ? (
                    <InlineLoader className="w-4 h-4" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
