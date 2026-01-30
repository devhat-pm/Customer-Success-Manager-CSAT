import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interactionsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Plus,
  MessageCircle,
  Phone,
  Mail,
  Video,
  Calendar,
  AlertTriangle,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const INTERACTION_TYPES = [
  { value: 'support_ticket', label: 'Support Ticket', icon: AlertTriangle },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'escalation', label: 'Escalation', icon: AlertTriangle },
  { value: 'training', label: 'Training', icon: GraduationCap },
]

const SENTIMENTS = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
]

const typeIcons = {
  support_ticket: AlertTriangle,
  meeting: Video,
  email: Mail,
  call: Phone,
  escalation: AlertTriangle,
  training: GraduationCap,
}

const sentimentColors = {
  positive: 'success',
  neutral: 'secondary',
  negative: 'danger',
}

const initialFormState = {
  interaction_type: 'meeting',
  subject: '',
  description: '',
  sentiment: 'neutral',
  follow_up_required: false,
  follow_up_date: '',
}

export function CustomerInteractionsTab({ customer }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState(initialFormState)
  const limit = 10
  const customerId = customer?.id

  // Fetch interactions
  const { data, isLoading } = useQuery({
    queryKey: ['customer-interactions', customerId, page, typeFilter],
    queryFn: () =>
      interactionsAPI.getByCustomer(customerId, {
        skip: (page - 1) * limit,
        limit,
        interaction_type: typeFilter !== 'all' ? typeFilter : undefined,
      }).then(res => res.data),
    enabled: !!customerId,
  })

  const interactions = data?.interactions || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  // Create interaction mutation
  const createMutation = useMutation({
    mutationFn: (data) =>
      interactionsAPI.create({
        ...data,
        customer_id: customer.id,
        performed_by: user?.full_name || 'User',
      }),
    onSuccess: () => {
      toast.success('Interaction Logged', 'The interaction has been recorded.')
      queryClient.invalidateQueries(['customer-interactions', customer.id])
      closeModal()
    },
    onError: () => {
      toast.error('Error', 'Failed to log interaction.')
    },
  })

  const closeModal = () => {
    setModalOpen(false)
    setFormData(initialFormState)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.subject.trim()) {
      toast.error('Error', 'Please provide a subject.')
      return
    }
    createMutation.mutate(formData)
  }

  if (isLoading && page === 1) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Interactions</CardTitle>
          <div className="flex items-center gap-3">
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {INTERACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Log Interaction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {interactions.length > 0 ? (
            <>
              <div className="space-y-4">
                {interactions.map((interaction) => {
                  const Icon = typeIcons[interaction.interaction_type] || MessageCircle

                  return (
                    <div
                      key={interaction.id}
                      className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-white">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800">{interaction.subject}</span>
                          <Badge variant={sentimentColors[interaction.sentiment] || 'secondary'}>
                            {interaction.sentiment || 'neutral'}
                          </Badge>
                          {interaction.follow_up_required && (
                            <Badge variant="warning">Follow-up</Badge>
                          )}
                        </div>
                        {interaction.description && (
                          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                            {interaction.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="capitalize">
                            {interaction.interaction_type?.replace('_', ' ')}
                          </span>
                          <span>by {interaction.performed_by}</span>
                          <span>
                            {formatDistanceToNow(new Date(interaction.interaction_date), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
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
                    <span className="text-sm text-slate-600">
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
            </>
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No interactions yet</p>
              <p className="text-sm text-slate-400 mb-4">Log an interaction to track communications</p>
              <Button onClick={() => setModalOpen(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Log Interaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Interaction Modal */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type <span className="text-danger">*</span>
              </label>
              <Select
                value={formData.interaction_type}
                onValueChange={(value) => setFormData({ ...formData, interaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subject <span className="text-danger">*</span>
              </label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                rows={3}
                placeholder="Enter details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sentiment
              </label>
              <Select
                value={formData.sentiment}
                onValueChange={(value) => setFormData({ ...formData, sentiment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SENTIMENTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.follow_up_required}
                  onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">Follow-up required</span>
              </label>
            </div>

            {formData.follow_up_required && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Follow-up Date
                </label>
                <Input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !formData.subject.trim()}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log Interaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
