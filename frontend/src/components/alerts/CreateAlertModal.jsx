import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alertsAPI, customersAPI } from '@/services/api'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  Loader2,
  Plus,
  TrendingDown,
  Calendar,
  Star,
  Clock,
  Zap,
} from 'lucide-react'

const severityOptions = [
  { value: 'critical', label: 'Critical', icon: AlertOctagon, color: 'text-danger', description: 'Requires immediate attention' },
  { value: 'high', label: 'High', icon: AlertTriangle, color: 'text-orange-500', description: 'Should be addressed soon' },
  { value: 'medium', label: 'Medium', icon: AlertCircle, color: 'text-warning', description: 'Monitor and plan action' },
  { value: 'low', label: 'Low', icon: Info, color: 'text-primary', description: 'For awareness' },
]

const typeOptions = [
  { value: 'health_drop', label: 'Health Drop', icon: TrendingDown, description: 'Customer health score decreased' },
  { value: 'contract_expiry', label: 'Contract Expiry', icon: Calendar, description: 'Contract renewal approaching' },
  { value: 'low_csat', label: 'Low CSAT', icon: Star, description: 'Customer satisfaction concern' },
  { value: 'escalation', label: 'Escalation', icon: AlertTriangle, description: 'Issue escalated' },
  { value: 'inactivity', label: 'Inactivity', icon: Clock, description: 'Customer has been inactive' },
  { value: 'usage_drop', label: 'Usage Drop', icon: Zap, description: 'Product usage declined' },
  { value: 'custom', label: 'Custom', icon: AlertCircle, description: 'Custom alert type' },
]

const initialFormState = {
  title: '',
  description: '',
  severity: 'medium',
  alert_type: 'custom',
  customer_id: '',
  triggered_value: '',
  threshold: '',
}

export function CreateAlertModal({ open, onClose, onSuccess, preselectedCustomerId }) {
  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({})
  const queryClient = useQueryClient()

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
    enabled: open,
  })

  const customers = customersData?.customers || []

  // Set preselected customer
  useEffect(() => {
    if (open && preselectedCustomerId) {
      setFormData(prev => ({ ...prev, customer_id: preselectedCustomerId }))
    }
  }, [open, preselectedCustomerId])

  const createMutation = useMutation({
    mutationFn: (data) => alertsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      onSuccess?.()
      handleClose()
    },
    onError: (error) => {
      if (error.response?.data?.detail) {
        setErrors({ submit: error.response.data.detail })
      }
    },
  })

  const handleClose = () => {
    setFormData(initialFormState)
    setErrors({})
    onClose()
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!formData.severity) {
      newErrors.severity = 'Severity is required'
    }
    if (!formData.alert_type) {
      newErrors.alert_type = 'Alert type is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const submitData = {
      ...formData,
      customer_id: formData.customer_id || null,
      triggered_value: formData.triggered_value || null,
      threshold: formData.threshold || null,
    }

    createMutation.mutate(submitData)
  }

  const selectedSeverity = severityOptions.find(s => s.value === formData.severity)
  const selectedType = typeOptions.find(t => t.value === formData.alert_type)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Manual Alert
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Alert Title <span className="text-danger">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter alert title..."
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={errors.title ? 'border-danger' : ''}
              />
              {errors.title && (
                <p className="text-xs text-danger">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the alert..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Severity and Type Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Severity */}
              <div className="space-y-2">
                <Label>
                  Severity <span className="text-danger">*</span>
                </Label>
                <Select
                  value={formData.severity}
                  onValueChange={(v) => handleChange('severity', v)}
                >
                  <SelectTrigger className={errors.severity ? 'border-danger' : ''}>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {selectedSeverity && (
                  <p className="text-xs text-slate-400">{selectedSeverity.description}</p>
                )}
              </div>

              {/* Alert Type */}
              <div className="space-y-2">
                <Label>
                  Alert Type <span className="text-danger">*</span>
                </Label>
                <Select
                  value={formData.alert_type}
                  onValueChange={(v) => handleChange('alert_type', v)}
                >
                  <SelectTrigger className={errors.alert_type ? 'border-danger' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-xs text-slate-400">{selectedType.description}</p>
                )}
              </div>
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label>Customer (optional)</Label>
              <Select
                value={formData.customer_id || 'none'}
                onValueChange={(v) => handleChange('customer_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific customer</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional: Triggered Value and Threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="triggered_value">Triggered Value (optional)</Label>
                <Input
                  id="triggered_value"
                  placeholder="e.g., 45"
                  value={formData.triggered_value}
                  onChange={(e) => handleChange('triggered_value', e.target.value)}
                />
                <p className="text-xs text-slate-400">The value that triggered this alert</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold (optional)</Label>
                <Input
                  id="threshold"
                  placeholder="e.g., 50"
                  value={formData.threshold}
                  onChange={(e) => handleChange('threshold', e.target.value)}
                />
                <p className="text-xs text-slate-400">The threshold for this alert</p>
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="p-3 bg-danger/10 text-danger text-sm rounded-lg">
                {errors.submit}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
