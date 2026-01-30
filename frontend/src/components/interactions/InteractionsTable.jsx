import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
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
import { InteractionTypeIcon, SentimentBadge } from './InteractionFilters'
import { format, parseISO, isPast } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Calendar,
  AlertTriangle,
  User,
  MessageSquare,
} from 'lucide-react'

const typeColors = {
  support: 'bg-primary/10 text-primary',
  meeting: 'bg-secondary/10 text-secondary',
  email: 'bg-accent/10 text-accent',
  call: 'bg-success/10 text-success',
  escalation: 'bg-danger/10 text-danger',
  training: 'bg-warning/10 text-warning',
}

export function InteractionsTable({
  interactions,
  total,
  page,
  limit,
  onPageChange,
  onViewInteraction,
  onEditInteraction,
  isLoading,
}) {
  const totalPages = Math.ceil(total / limit)

  if (isLoading) {
    return <InteractionsTableSkeleton />
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Sentiment</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions && interactions.length > 0 ? (
                interactions.map((interaction) => {
                  const hasFollowup = interaction.follow_up_required && interaction.follow_up_date
                  const isOverdue = hasFollowup && isPast(parseISO(interaction.follow_up_date))

                  return (
                    <TableRow
                      key={interaction.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => onViewInteraction(interaction)}
                    >
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {interaction.interaction_date
                            ? format(parseISO(interaction.interaction_date), 'MMM d, yyyy')
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                            {interaction.customer_name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-slate-800">
                            {interaction.customer_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${typeColors[interaction.interaction_type] || 'bg-slate-100 text-slate-600'}`}>
                          <InteractionTypeIcon type={interaction.interaction_type} className="w-3 h-3" />
                          <span className="capitalize">{interaction.interaction_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-800 truncate max-w-[200px]">
                          {interaction.subject || '-'}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <SentimentBadge sentiment={interaction.sentiment} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="w-3 h-3" />
                          {interaction.performed_by_name || interaction.performed_by || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasFollowup ? (
                          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-danger' : 'text-slate-600'}`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3" />}
                            <Calendar className="w-3 h-3" />
                            <span>{format(parseISO(interaction.follow_up_date), 'MMM d')}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onViewInteraction(interaction)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEditInteraction(interaction)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No interactions found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
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
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InteractionsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Sentiment</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
                      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-16 mx-auto bg-slate-200 rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
