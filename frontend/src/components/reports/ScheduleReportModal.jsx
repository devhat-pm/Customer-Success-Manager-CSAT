import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsAPI, customersAPI } from '@/services/api'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecipientsInput } from './RecipientsInput'
import {
  Calendar,
  Clock,
  Loader2,
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

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
]

const dayOfWeekOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const dayOfMonthOptions = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}))

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

const quarterMonthOptions = [
  { value: 1, label: 'First month of quarter' },
  { value: 2, label: 'Second month of quarter' },
  { value: 3, label: 'Third month of quarter' },
]

const initialFormState = {
  name: '',
  report_type: '',
  frequency: 'weekly',
  time: '09:00',
  day_of_week: 1,
  day_of_month: 1,
  quarter_month: 1,
  recipients: [],
  customer_id: '',
  is_active: true,
}

export function ScheduleReportModal({ open, onClose, schedule, onSuccess }) {
  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({})
  const queryClient = useQueryClient()
  const isEditing = !!schedule

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
    enabled: open,
  })

  const customers = customersData?.customers || []

  // Initialize form when editing
  useEffect(() => {
    if (open) {
      if (schedule) {
        setFormData({
          name: schedule.name || '',
          report_type: schedule.report_type || '',
          frequency: schedule.frequency || 'weekly',
          time: schedule.time || '09:00',
          day_of_week: schedule.day_of_week ?? 1,
          day_of_month: schedule.day_of_month ?? 1,
          quarter_month: schedule.quarter_month ?? 1,
          recipients: schedule.recipients || [],
          customer_id: schedule.customer_id || '',
          is_active: schedule.is_active ?? true,
        })
      } else {
        setFormData(initialFormState)
      }
      setErrors({})
    }
  }, [open, schedule])

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEditing) {
        return reportsAPI.updateSchedule(schedule.id, data)
      }
      return reportsAPI.createSchedule(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] })
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

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.report_type) {
      newErrors.report_type = 'Report type is required'
    }
    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required'
    }
    if (formData.recipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required'
    }
    if (formData.report_type === 'customer_overview' && !formData.customer_id) {
      newErrors.customer_id = 'Customer is required for this report type'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const submitData = {
      name: formData.name,
      report_type: formData.report_type,
      frequency: formData.frequency,
      time: formData.time,
      recipients: formData.recipients,
      is_active: formData.is_active,
      customer_id: formData.customer_id || null,
    }

    // Add frequency-specific fields
    if (formData.frequency === 'weekly') {
      submitData.day_of_week = formData.day_of_week
    } else if (formData.frequency === 'monthly') {
      submitData.day_of_month = formData.day_of_month
    } else if (formData.frequency === 'quarterly') {
      submitData.quarter_month = formData.quarter_month
      submitData.day_of_month = formData.day_of_month
    }

    saveMutation.mutate(submitData)
  }

  const isCustomerReport = formData.report_type === 'customer_overview'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {isEditing ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Report Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Report Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter report name..."
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'border-danger' : ''}
              />
              {errors.name && (
                <p className="text-xs text-danger">{errors.name}</p>
              )}
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label>
                Report Type <span className="text-danger">*</span>
              </Label>
              <Select
                value={formData.report_type}
                onValueChange={(v) => handleChange('report_type', v)}
              >
                <SelectTrigger className={errors.report_type ? 'border-danger' : ''}>
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
              {errors.report_type && (
                <p className="text-xs text-danger">{errors.report_type}</p>
              )}
            </div>

            {/* Customer Selection (for customer overview) */}
            {isCustomerReport && (
              <div className="space-y-2">
                <Label>
                  Customer <span className="text-danger">*</span>
                </Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(v) => handleChange('customer_id', v)}
                >
                  <SelectTrigger className={errors.customer_id ? 'border-danger' : ''}>
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
                {errors.customer_id && (
                  <p className="text-xs text-danger">{errors.customer_id}</p>
                )}
              </div>
            )}

            {/* Frequency */}
            <div className="space-y-2">
              <Label>
                Frequency <span className="text-danger">*</span>
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(v) => handleChange('frequency', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency..." />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency-specific settings */}
            <div className="grid grid-cols-2 gap-4">
              {/* Time */}
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleChange('time', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Day of Week (for weekly) */}
              {formData.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={String(formData.day_of_week)}
                    onValueChange={(v) => handleChange('day_of_week', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOfWeekOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Day of Month (for monthly) */}
              {formData.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select
                    value={String(formData.day_of_month)}
                    onValueChange={(v) => handleChange('day_of_month', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOfMonthOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quarterly settings */}
              {formData.frequency === 'quarterly' && (
                <>
                  <div className="space-y-2">
                    <Label>Month in Quarter</Label>
                    <Select
                      value={String(formData.quarter_month)}
                      onValueChange={(v) => handleChange('quarter_month', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {quarterMonthOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select
                      value={String(formData.day_of_month)}
                      onValueChange={(v) => handleChange('day_of_month', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayOfMonthOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label>
                Recipients <span className="text-danger">*</span>
              </Label>
              <RecipientsInput
                value={formData.recipients}
                onChange={(recipients) => handleChange('recipients', recipients)}
                placeholder="Add recipient email..."
              />
              {errors.recipients && (
                <p className="text-xs text-danger">{errors.recipients}</p>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                <p className="text-xs text-slate-500">Enable or disable this scheduled report</p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
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
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  {isEditing ? 'Update Schedule' : 'Create Schedule'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
