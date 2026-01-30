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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SeverityBadge } from './AlertFilters'
import { CheckCircle, Loader2 } from 'lucide-react'

export function ResolveAlertModal({ open, onClose, alert, onSuccess }) {
  const [notes, setNotes] = useState('')
  const [createFollowup, setCreateFollowup] = useState(false)
  const [followupNotes, setFollowupNotes] = useState('')
  const queryClient = useQueryClient()

  const resolveMutation = useMutation({
    mutationFn: (data) => alertsAPI.resolve(alert.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      onSuccess?.()
      handleClose()
    },
  })

  const handleClose = () => {
    setNotes('')
    setCreateFollowup(false)
    setFollowupNotes('')
    onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    resolveMutation.mutate({
      resolution_notes: notes,
      create_followup: createFollowup,
      followup_notes: followupNotes,
    })
  }

  if (!alert) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Resolve Alert
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

            {/* Resolution Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Resolution Notes</Label>
              <Textarea
                id="notes"
                placeholder="Describe how this alert was resolved..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-slate-400">
                Optional: Add notes about how this alert was addressed
              </p>
            </div>

            {/* Create Follow-up Option */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createFollowup"
                  checked={createFollowup}
                  onCheckedChange={setCreateFollowup}
                />
                <Label htmlFor="createFollowup" className="text-sm font-normal cursor-pointer">
                  Create a follow-up task
                </Label>
              </div>

              {createFollowup && (
                <div className="pl-6 space-y-2">
                  <Label htmlFor="followupNotes">Follow-up Description</Label>
                  <Textarea
                    id="followupNotes"
                    placeholder="What needs to be done as a follow-up?"
                    value={followupNotes}
                    onChange={(e) => setFollowupNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={resolveMutation.isPending}
              className="gap-2"
            >
              {resolveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Mark as Resolved
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BulkResolveModal({ open, onClose, alerts, onSuccess }) {
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const bulkResolveMutation = useMutation({
    mutationFn: (data) => alertsAPI.bulkResolve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] })
      onSuccess?.()
      handleClose()
    },
  })

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    bulkResolveMutation.mutate({
      alert_ids: alerts.map(a => a.id),
      resolution_notes: notes,
    })
  }

  if (!alerts?.length) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Resolve {alerts.length} Alerts
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Alerts Summary */}
            <div className="p-3 bg-slate-50 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-sm text-slate-500 mb-2">
                You are about to resolve the following alerts:
              </p>
              <ul className="space-y-1">
                {alerts.map((alert) => (
                  <li key={alert.id} className="text-sm flex items-center justify-between">
                    <span className="truncate mr-2">{alert.title}</span>
                    <SeverityBadge severity={alert.severity || 'medium'} size="sm" />
                  </li>
                ))}
              </ul>
            </div>

            {/* Resolution Notes */}
            <div className="space-y-2">
              <Label htmlFor="bulkNotes">Resolution Notes (applied to all)</Label>
              <Textarea
                id="bulkNotes"
                placeholder="Add notes for all resolved alerts..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bulkResolveMutation.isPending}
              className="gap-2"
            >
              {bulkResolveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Resolve All ({alerts.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
