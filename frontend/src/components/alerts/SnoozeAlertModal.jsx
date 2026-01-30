import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsAPI } from '@/services/api'
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
import { SeverityBadge } from './AlertFilters'
import { BellOff, Loader2, Calendar, Clock } from 'lucide-react'
import { addDays, addHours, format } from 'date-fns'

const snoozeOptions = [
  { label: '1 hour', value: 'hour', hours: 1 },
  { label: '4 hours', value: '4hours', hours: 4 },
  { label: '1 day', value: 'day', days: 1 },
  { label: '3 days', value: '3days', days: 3 },
  { label: '1 week', value: 'week', days: 7 },
  { label: 'Custom', value: 'custom' },
]

export function SnoozeAlertModal({ open, onClose, alert, onSuccess }) {
  const [selectedOption, setSelectedOption] = useState('day')
  const [customDate, setCustomDate] = useState('')
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()

  const snoozeMutation = useMutation({
    mutationFn: (data) => alertsAPI.snooze(alert.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      onSuccess?.()
      handleClose()
    },
  })

  const handleClose = () => {
    setSelectedOption('day')
    setCustomDate('')
    setReason('')
    onClose()
  }

  const getSnoozeUntil = () => {
    const now = new Date()
    const option = snoozeOptions.find(o => o.value === selectedOption)

    if (selectedOption === 'custom') {
      return customDate ? new Date(customDate) : null
    }

    if (option?.hours) {
      return addHours(now, option.hours)
    }

    if (option?.days) {
      return addDays(now, option.days)
    }

    return addDays(now, 1)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const snoozeUntil = getSnoozeUntil()

    if (!snoozeUntil) return

    snoozeMutation.mutate({
      snoozed_until: snoozeUntil.toISOString(),
      snooze_reason: reason,
    })
  }

  if (!alert) return null

  const snoozeUntil = getSnoozeUntil()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5 text-slate-500" />
            Snooze Alert
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Alert Summary */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-slate-800">{alert.title}</h4>
                <SeverityBadge severity={alert.severity || 'medium'} size="sm" />
              </div>
              {alert.customer_name && (
                <p className="text-sm text-slate-500 mt-1">{alert.customer_name}</p>
              )}
            </div>

            {/* Snooze Duration */}
            <div className="space-y-2">
              <Label>Snooze Duration</Label>
              <div className="grid grid-cols-3 gap-2">
                {snoozeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedOption === option.value ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedOption(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Picker */}
            {selectedOption === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customDate">Snooze Until</Label>
                <Input
                  id="customDate"
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  required
                />
              </div>
            )}

            {/* Snooze Preview */}
            {snoozeUntil && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-slate-600">
                  Will reappear on {format(snoozeUntil, 'MMM d, yyyy')} at {format(snoozeUntil, 'h:mm a')}
                </span>
              </div>
            )}

            {/* Snooze Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Why are you snoozing this alert?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={snoozeMutation.isPending || (selectedOption === 'custom' && !customDate)}
              variant="secondary"
              className="gap-2"
            >
              {snoozeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Snoozing...
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  Snooze Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BulkSnoozeModal({ open, onClose, alerts, onSuccess }) {
  const [selectedOption, setSelectedOption] = useState('day')
  const [customDate, setCustomDate] = useState('')
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()

  const bulkSnoozeMutation = useMutation({
    mutationFn: (data) => alertsAPI.bulkSnooze(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      onSuccess?.()
      handleClose()
    },
  })

  const handleClose = () => {
    setSelectedOption('day')
    setCustomDate('')
    setReason('')
    onClose()
  }

  const getSnoozeUntil = () => {
    const now = new Date()
    const option = snoozeOptions.find(o => o.value === selectedOption)

    if (selectedOption === 'custom') {
      return customDate ? new Date(customDate) : null
    }

    if (option?.hours) {
      return addHours(now, option.hours)
    }

    if (option?.days) {
      return addDays(now, option.days)
    }

    return addDays(now, 1)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const snoozeUntil = getSnoozeUntil()

    if (!snoozeUntil) return

    bulkSnoozeMutation.mutate({
      alert_ids: alerts.map(a => a.id),
      snoozed_until: snoozeUntil.toISOString(),
      snooze_reason: reason,
    })
  }

  if (!alerts?.length) return null

  const snoozeUntil = getSnoozeUntil()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5 text-slate-500" />
            Snooze {alerts.length} Alerts
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Alerts Summary */}
            <div className="p-3 bg-slate-50 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-sm text-slate-500 mb-2">
                Snoozing {alerts.length} selected alerts
              </p>
              <ul className="space-y-1">
                {alerts.slice(0, 5).map((alert) => (
                  <li key={alert.id} className="text-sm truncate text-slate-700">
                    {alert.title}
                  </li>
                ))}
                {alerts.length > 5 && (
                  <li className="text-sm text-slate-400">
                    ...and {alerts.length - 5} more
                  </li>
                )}
              </ul>
            </div>

            {/* Snooze Duration */}
            <div className="space-y-2">
              <Label>Snooze Duration</Label>
              <div className="grid grid-cols-3 gap-2">
                {snoozeOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedOption === option.value ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedOption(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Picker */}
            {selectedOption === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="bulkCustomDate">Snooze Until</Label>
                <Input
                  id="bulkCustomDate"
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  required
                />
              </div>
            )}

            {/* Snooze Preview */}
            {snoozeUntil && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-slate-600">
                  Will reappear on {format(snoozeUntil, 'MMM d, yyyy')} at {format(snoozeUntil, 'h:mm a')}
                </span>
              </div>
            )}

            {/* Snooze Reason */}
            <div className="space-y-2">
              <Label htmlFor="bulkReason">Reason (optional)</Label>
              <Textarea
                id="bulkReason"
                placeholder="Why are you snoozing these alerts?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bulkSnoozeMutation.isPending || (selectedOption === 'custom' && !customDate)}
              variant="secondary"
              className="gap-2"
            >
              {bulkSnoozeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Snoozing...
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" />
                  Snooze All ({alerts.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
