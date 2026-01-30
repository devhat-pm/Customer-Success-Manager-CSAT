import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format, parseISO } from 'date-fns'
import {
  MoreVertical,
  Edit,
  Play,
  Trash2,
  Pause,
  Clock,
  Calendar,
  Activity,
  Star,
  Users,
  Briefcase,
  Loader2,
  Mail,
} from 'lucide-react'

const reportTypeIcons = {
  health_summary: Activity,
  csat_analysis: Star,
  customer_overview: Users,
  executive_summary: Briefcase,
}

const reportTypeLabels = {
  health_summary: 'Health Summary',
  csat_analysis: 'CSAT Analysis',
  customer_overview: 'Customer Overview',
  executive_summary: 'Executive Summary',
}

const frequencyLabels = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

const frequencyColors = {
  daily: 'bg-blue-100 text-blue-700',
  weekly: 'bg-green-100 text-green-700',
  monthly: 'bg-purple-100 text-purple-700',
  quarterly: 'bg-orange-100 text-orange-700',
}

export function ScheduledReportsTable({
  schedules,
  isLoading,
  onEdit,
  onRunNow,
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState(null)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id) => reportsAPI.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] })
      setDeleteConfirmOpen(false)
      setScheduleToDelete(null)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }) => reportsAPI.updateSchedule(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] })
    },
  })

  const runNowMutation = useMutation({
    mutationFn: (id) => reportsAPI.runScheduleNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-history'] })
      onRunNow?.()
    },
  })

  const handleDelete = (schedule) => {
    setScheduleToDelete(schedule)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (scheduleToDelete) {
      deleteMutation.mutate(scheduleToDelete.id)
    }
  }

  const handleToggleStatus = (schedule) => {
    toggleStatusMutation.mutate({
      id: schedule.id,
      is_active: !schedule.is_active,
    })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
    } catch {
      return '-'
    }
  }

  if (isLoading) {
    return <ScheduledReportsTableSkeleton />
  }

  if (!schedules?.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Scheduled Reports</h3>
          <p className="text-slate-500">
            Create a schedule to automatically generate and send reports.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Last Generated</TableHead>
                <TableHead>Next Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const TypeIcon = reportTypeIcons[schedule.report_type] || Activity
                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <span className="font-medium text-slate-800">{schedule.name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          {reportTypeLabels[schedule.report_type] || schedule.report_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={frequencyColors[schedule.frequency] || 'bg-slate-100 text-slate-700'}>
                        {frequencyLabels[schedule.frequency] || schedule.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RecipientsDisplay recipients={schedule.recipients || []} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(schedule.last_generated)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(schedule.next_scheduled)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={schedule.is_active ? 'success' : 'secondary'}>
                        {schedule.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit?.(schedule)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => runNowMutation.mutate(schedule.id)}
                            disabled={runNowMutation.isPending}
                          >
                            {runNowMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            Run Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(schedule)}>
                            {schedule.is_active ? (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(schedule)}
                            className="text-danger"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scheduleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-danger hover:bg-danger/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function RecipientsDisplay({ recipients }) {
  if (!recipients?.length) {
    return <span className="text-sm text-slate-400">No recipients</span>
  }

  const displayCount = 2
  const remaining = recipients.length - displayCount

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {recipients.slice(0, displayCount).map((email, index) => (
          <div
            key={email}
            className="w-7 h-7 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center"
            title={email}
          >
            <span className="text-xs font-medium text-primary">
              {email.charAt(0).toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <span className="text-xs text-slate-500 ml-1">+{remaining}</span>
      )}
    </div>
  )
}

function ScheduledReportsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Last Generated</TableHead>
              <TableHead>Next Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-32 bg-slate-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-slate-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" /></TableCell>
                <TableCell><div className="h-7 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-5 w-14 bg-slate-200 rounded-full animate-pulse" /></TableCell>
                <TableCell><div className="h-8 w-8 bg-slate-200 rounded animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
