import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI, interactionsAPI } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { InteractionTypeIcon } from './InteractionFilters'
import { format } from 'date-fns'
import {
  Loader2,
  Phone,
  Mail,
  Video,
  MessageSquare,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react'

const interactionTypes = [
  { value: 'support', label: 'Support', icon: MessageSquare },
  { value: 'meeting', label: 'Meeting', icon: Video },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'escalation', label: 'Escalation', icon: AlertTriangle },
  { value: 'training', label: 'Training', icon: GraduationCap },
]

const sentiments = [
  { value: 'positive', label: 'Positive', color: 'text-success' },
  { value: 'neutral', label: 'Neutral', color: 'text-slate-500' },
  { value: 'negative', label: 'Negative', color: 'text-danger' },
]

const initialFormData = {
  customer_id: '',
  interaction_type: '',
  subject: '',
  description: '',
  sentiment: 'neutral',
  performed_by: '',
  interaction_date: format(new Date(), 'yyyy-MM-dd'),
  follow_up_required: false,
  follow_up_date: '',
}

export function LogInteractionModal({ open, onClose, interaction = null }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})

  const isEditing = !!interaction

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
    enabled: open,
  })

  const customers = customersData?.customers || []

  // Initialize form data
  useEffect(() => {
    if (interaction) {
      setFormData({
        customer_id: interaction.customer_id || '',
        interaction_type: interaction.interaction_type || '',
        subject: interaction.subject || '',
        description: interaction.description || '',
        sentiment: interaction.sentiment || 'neutral',
        performed_by: interaction.performed_by || '',
        interaction_date: interaction.interaction_date
          ? format(new Date(interaction.interaction_date), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        follow_up_required: interaction.follow_up_required || false,
        follow_up_date: interaction.follow_up_date
          ? format(new Date(interaction.follow_up_date), 'yyyy-MM-dd')
          : '',
      })
    } else {
      setFormData({
        ...initialFormData,
        performed_by: user?.id || '',
      })
    }
    setErrors({})
  }, [interaction, user, open])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => interactionsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] })
      toast.success('Interaction Logged', 'The interaction has been logged successfully.')
      handleClose()
    },
    onError: (error) => {
      toast.error('Error', error.response?.data?.detail || 'Failed to log interaction.')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => interactionsAPI.update(interaction.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] })
      toast.success('Interaction Updated', 'The interaction has been updated successfully.')
      handleClose()
    },
    onError: (error) => {
      toast.error('Error', error.response?.data?.detail || 'Failed to update interaction.')
    },
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.customer_id) newErrors.customer_id = 'Customer is required'
    if (!formData.interaction_type) newErrors.interaction_type = 'Type is required'
    if (!formData.subject?.trim()) newErrors.subject = 'Subject is required'
    if (!formData.description?.trim()) newErrors.description = 'Description is required'
    if (!formData.interaction_date) newErrors.interaction_date = 'Date is required'
    if (formData.follow_up_required && !formData.follow_up_date) {
      newErrors.follow_up_date = 'Follow-up date is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const data = {
      ...formData,
      interaction_date: new Date(formData.interaction_date).toISOString(),
      follow_up_date: formData.follow_up_required && formData.follow_up_date
        ? formData.follow_up_date
        : null,
    }

    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Interaction' : 'Log Interaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Customer */}
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer *</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(v) => handleChange('customer_id', v)}
            >
              <SelectTrigger className={errors.customer_id ? 'border-danger' : ''}>
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
            {errors.customer_id && (
              <p className="text-xs text-danger">{errors.customer_id}</p>
            )}
          </div>

          {/* Interaction Type */}
          <div className="space-y-2">
            <Label htmlFor="interaction_type">Interaction Type *</Label>
            <Select
              value={formData.interaction_type}
              onValueChange={(v) => handleChange('interaction_type', v)}
            >
              <SelectTrigger className={errors.interaction_type ? 'border-danger' : ''}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {interactionTypes.map((type) => {
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
            {errors.interaction_type && (
              <p className="text-xs text-danger">{errors.interaction_type}</p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Enter subject"
              className={errors.subject ? 'border-danger' : ''}
            />
            {errors.subject && (
              <p className="text-xs text-danger">{errors.subject}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter details about the interaction..."
              rows={4}
              className={`w-full px-3 py-2 rounded-md border ${
                errors.description ? 'border-danger' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-primary resize-none`}
            />
            {errors.description && (
              <p className="text-xs text-danger">{errors.description}</p>
            )}
          </div>

          {/* Sentiment */}
          <div className="space-y-2">
            <Label>Sentiment</Label>
            <div className="flex items-center gap-4">
              {sentiments.map((sentiment) => (
                <label
                  key={sentiment.value}
                  className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border ${
                    formData.sentiment === sentiment.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sentiment"
                    value={sentiment.value}
                    checked={formData.sentiment === sentiment.value}
                    onChange={(e) => handleChange('sentiment', e.target.value)}
                    className="sr-only"
                  />
                  <span className={sentiment.color}>{sentiment.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="interaction_date">Interaction Date *</Label>
            <Input
              id="interaction_date"
              type="date"
              value={formData.interaction_date}
              onChange={(e) => handleChange('interaction_date', e.target.value)}
              className={errors.interaction_date ? 'border-danger' : ''}
            />
            {errors.interaction_date && (
              <p className="text-xs text-danger">{errors.interaction_date}</p>
            )}
          </div>

          {/* Follow-up Required */}
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                id="follow_up_required"
                checked={formData.follow_up_required}
                onCheckedChange={(checked) => handleChange('follow_up_required', checked)}
              />
              <Label htmlFor="follow_up_required" className="cursor-pointer">
                Follow-up Required
              </Label>
            </div>

            {formData.follow_up_required && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="follow_up_date">Follow-up Date *</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => handleChange('follow_up_date', e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className={errors.follow_up_date ? 'border-danger' : ''}
                />
                {errors.follow_up_date && (
                  <p className="text-xs text-danger">{errors.follow_up_date}</p>
                )}
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? 'Updating...' : 'Logging...'}
              </>
            ) : (
              isEditing ? 'Update Interaction' : 'Log Interaction'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
