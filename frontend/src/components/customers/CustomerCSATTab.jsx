import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { csatAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Plus,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
} from 'lucide-react'

const SURVEY_TYPES = [
  { value: 'general_feedback', label: 'General Feedback (CSAT 1-5)' },
  { value: 'nps', label: 'NPS (0-10)' },
  { value: 'product_feedback', label: 'Product Feedback (1-5)' },
  { value: 'quarterly_review', label: 'Quarterly Review (1-5)' },
]

export function CustomerCSATTab({ customer }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    survey_type: 'general_feedback',
    score: '',
    feedback_text: '',
    submitted_by_name: '',
    submitted_by_email: '',
  })
  const limit = 10
  const customerId = customer?.id

  // Fetch CSAT surveys for this customer
  const { data, isLoading } = useQuery({
    queryKey: ['customer-csat', customerId, page],
    queryFn: () =>
      csatAPI.getAll({
        customer_id: customerId,
        skip: (page - 1) * limit,
        limit,
      }).then(res => res.data),
    enabled: !!customerId,
  })

  // Fetch customer CSAT summary
  const { data: summary } = useQuery({
    queryKey: ['customer-csat-summary', customerId],
    queryFn: () => csatAPI.getCustomerSummary(customerId).then(res => res.data),
    enabled: !!customerId,
  })

  const surveys = data?.surveys || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  // Submit CSAT mutation
  const submitMutation = useMutation({
    mutationFn: (data) => csatAPI.submit({ ...data, customer_id: customer.id }),
    onSuccess: () => {
      toast.success('CSAT Submitted', 'The CSAT survey has been recorded.')
      queryClient.invalidateQueries(['customer-csat', customer.id])
      queryClient.invalidateQueries(['customer-csat-summary', customer.id])
      closeModal()
    },
    onError: () => {
      toast.error('Error', 'Failed to submit CSAT survey.')
    },
  })

  const closeModal = () => {
    setModalOpen(false)
    setFormData({
      survey_type: 'general_feedback',
      score: '',
      feedback_text: '',
      submitted_by_name: '',
      submitted_by_email: '',
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.score) {
      toast.error('Error', 'Please provide a score.')
      return
    }
    submitMutation.mutate({
      ...formData,
      score: parseInt(formData.score),
    })
  }

  const getSentimentIcon = (score, type) => {
    if (type === 'nps') {
      if (score >= 9) return { icon: ThumbsUp, color: 'text-success' }
      if (score <= 6) return { icon: ThumbsDown, color: 'text-danger' }
      return { icon: Minus, color: 'text-warning' }
    }
    // CSAT (1-5 scale)
    if (score >= 4) return { icon: ThumbsUp, color: 'text-success' }
    if (score <= 2) return { icon: ThumbsDown, color: 'text-danger' }
    return { icon: Minus, color: 'text-warning' }
  }

  const getMaxScore = (type) => {
    if (type === 'nps') return 10
    return 5
  }

  const getMinScore = (type) => {
    if (type === 'nps') return 0
    return 1
  }

  if (isLoading && page === 1) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-slate-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg CSAT</p>
                <p className="text-2xl font-bold">
                  {summary?.avg_csat?.toFixed(1) || 'N/A'}/5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <ThumbsUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-slate-500">NPS Score</p>
                <p className="text-2xl font-bold">{summary?.nps_score ?? 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Surveys</p>
                <p className="text-2xl font-bold">{summary?.total_surveys || total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <ThumbsDown className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Low Scores</p>
                <p className="text-2xl font-bold">{summary?.low_scores || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSAT Submissions Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>CSAT Submissions</CardTitle>
            <CardDescription>Customer satisfaction survey responses</CardDescription>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add CSAT
          </Button>
        </CardHeader>
        <CardContent>
          {surveys.length > 0 ? (
            <>
              <div className="space-y-3">
                {surveys.map((survey) => {
                  const sentiment = getSentimentIcon(survey.score, survey.survey_type)
                  const SentimentIcon = sentiment.icon
                  const maxScore = getMaxScore(survey.survey_type)

                  return (
                    <div
                      key={survey.id}
                      className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg"
                    >
                      <div className={`p-2 rounded-lg bg-white ${sentiment.color}`}>
                        <SentimentIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-slate-800">
                            {survey.score}/{maxScore}
                          </span>
                          <Badge variant="secondary" className="uppercase text-xs">
                            {survey.survey_type}
                          </Badge>
                        </div>
                        {survey.feedback_text && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            "{survey.feedback_text}"
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          Submitted: {new Date(survey.submitted_at).toLocaleString()}
                        </p>
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
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No CSAT submissions yet</p>
              <p className="text-sm text-slate-400 mb-4">Add a survey response to track satisfaction</p>
              <Button onClick={() => setModalOpen(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add CSAT
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add CSAT Modal */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add CSAT Survey</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Survey Type <span className="text-danger">*</span>
              </label>
              <Select
                value={formData.survey_type}
                onValueChange={(value) => setFormData({ ...formData, survey_type: value, score: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SURVEY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Submitted By Name <span className="text-danger">*</span>
                </label>
                <Input
                  value={formData.submitted_by_name}
                  onChange={(e) => setFormData({ ...formData, submitted_by_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Submitted By Email <span className="text-danger">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.submitted_by_email}
                  onChange={(e) => setFormData({ ...formData, submitted_by_email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Score <span className="text-danger">*</span>
              </label>
              <Input
                type="number"
                min={getMinScore(formData.survey_type)}
                max={getMaxScore(formData.survey_type)}
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                placeholder={`Enter score (${getMinScore(formData.survey_type)}-${getMaxScore(formData.survey_type)})`}
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.survey_type === 'nps' && 'Scale: 0 (Not Likely) to 10 (Very Likely)'}
                {formData.survey_type !== 'nps' && 'Scale: 1 (Poor) to 5 (Excellent)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Feedback
              </label>
              <textarea
                value={formData.feedback_text}
                onChange={(e) => setFormData({ ...formData, feedback_text: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                rows={3}
                placeholder="Enter customer feedback..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending || !formData.score || !formData.submitted_by_name || !formData.submitted_by_email}
              >
                {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
