import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI, surveyRequestsAPI, deploymentsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Send,
  Check,
  Mail,
  Loader2,
  Users,
  User,
  AtSign,
} from 'lucide-react'

const surveyTypes = [
  { value: 'general_feedback', label: 'General Feedback', description: 'Open-ended feedback' },
  { value: 'nps', label: 'NPS Survey', description: 'Net Promoter Score (0-10)' },
  { value: 'quarterly_review', label: 'Quarterly Review', description: 'Regular check-in survey' },
  { value: 'product_feedback', label: 'Product Feedback', description: 'Feedback about specific product' },
  { value: 'ticket_followup', label: 'Ticket Follow-up', description: 'Post-support feedback' },
  { value: 'onboarding', label: 'Onboarding Survey', description: 'For new customers' },
]

const targetTypes = [
  { value: 'primary', label: 'Primary Contact', icon: User, description: 'Send to main contact only' },
  { value: 'all', label: 'All Contacts', icon: Users, description: 'Send to all customer users' },
  { value: 'specific', label: 'Specific Email', icon: AtSign, description: 'Send to a specific email' },
]

export function SurveyLinkModal({ open, onClose, initialCustomerId = '' }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [surveyType, setSurveyType] = useState('')
  const [targetType, setTargetType] = useState('primary')
  const [specificEmail, setSpecificEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [surveySent, setSurveySent] = useState(false)
  const [sentCount, setSentCount] = useState(0)

  // Reset state when modal opens with a new customer
  useEffect(() => {
    if (open) {
      if (initialCustomerId) {
        setCustomerId(initialCustomerId)
      }
      setSurveySent(false)
      setSentCount(0)
    }
  }, [open, initialCustomerId])

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
    enabled: open,
  })

  const customers = customersData?.customers || []
  const selectedCustomer = customers.find(c => c.id === customerId)

  // Send survey mutation
  const sendSurveyMutation = useMutation({
    mutationFn: (data) => surveyRequestsAPI.create(data),
    onSuccess: (response) => {
      const count = response.data?.requests?.length || response.data?.length || 1
      setSentCount(count)
      setSurveySent(true)
      queryClient.invalidateQueries(['survey-requests'])
      toast.success('Survey Sent!', `Survey invitation has been emailed to ${count} recipient(s).`)
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Failed to send survey. Please try again.'
      toast.error('Send Failed', message)
    },
  })

  const handleSend = () => {
    if (!customerId || !surveyType) {
      toast.error('Required Fields', 'Please select a customer and survey type.')
      return
    }

    if (targetType === 'specific' && !specificEmail) {
      toast.error('Required Fields', 'Please enter a specific email address.')
      return
    }

    sendSurveyMutation.mutate({
      customer_id: customerId,
      survey_type: surveyType,
      target_type: targetType,
      target_email: targetType === 'specific' ? specificEmail : undefined,
      custom_message: customMessage || undefined,
      expires_in_days: expiresInDays,
    })
  }

  const handleClose = () => {
    setCustomerId('')
    setSurveyType('')
    setTargetType('primary')
    setSpecificEmail('')
    setCustomMessage('')
    setExpiresInDays(30)
    setSurveySent(false)
    setSentCount(0)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Survey
          </DialogTitle>
          <DialogDescription>
            Send a survey invitation email to your customer for feedback.
          </DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {surveySent ? (
          <div className="py-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-success" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Survey Sent Successfully!</p>
                <p className="text-sm text-slate-500 mt-1">
                  {sentCount} survey invitation{sentCount > 1 ? 's have' : ' has'} been emailed to{' '}
                  <strong>{selectedCustomer?.company_name}</strong>
                </p>
              </div>
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="p-4 text-left">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span>Email sent to: {targetType === 'specific' ? specificEmail : targetType === 'all' ? 'All contacts' : 'Primary contact'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    The survey link will expire in {expiresInDays} days.
                  </p>
                </CardContent>
              </Card>
              <Button onClick={handleClose} className="mt-4">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label>Customer <span className="text-danger">*</span></Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer?.contact_email && (
                  <p className="text-xs text-slate-500">
                    Primary contact: {selectedCustomer.contact_name} ({selectedCustomer.contact_email})
                  </p>
                )}
              </div>

              {/* Survey Type */}
              <div className="space-y-2">
                <Label>Survey Type <span className="text-danger">*</span></Label>
                <Select value={surveyType} onValueChange={setSurveyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select survey type" />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <p>{type.label}</p>
                          <p className="text-xs text-slate-400">{type.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Type */}
              <div className="space-y-2">
                <Label>Send To</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targetTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <div>
                              <p>{type.label}</p>
                              <p className="text-xs text-slate-400">{type.description}</p>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Specific Email (if target type is specific) */}
              {targetType === 'specific' && (
                <div className="space-y-2">
                  <Label>Email Address <span className="text-danger">*</span></Label>
                  <Input
                    type="email"
                    value={specificEmail}
                    onChange={(e) => setSpecificEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              )}

              {/* Custom Message (Optional) */}
              <div className="space-y-2">
                <Label>Custom Message (Optional)</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message to the survey invitation..."
                  rows={3}
                />
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label>Link Expires In</Label>
                <Select value={String(expiresInDays)} onValueChange={(val) => setExpiresInDays(Number(val))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendSurveyMutation.isPending || !customerId || !surveyType}
                className="gap-2"
              >
                {sendSurveyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Survey
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
