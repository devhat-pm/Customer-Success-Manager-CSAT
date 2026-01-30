import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ticketsAPI } from '@/services/api'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/contexts/ToastContext'
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal'
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal'

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function CustomerTicketsTab({ customerId }) {
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Fetch customer tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['customer-tickets', customerId],
    queryFn: () => ticketsAPI.getByCustomer(customerId, { limit: 50 }).then(res => res.data),
    enabled: !!customerId,
  })

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => ticketsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-tickets', customerId])
      showToast('Ticket updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to update ticket', 'error')
    },
  })

  const handleStatusChange = (ticketId, newStatus) => {
    updateTicketMutation.mutate({ id: ticketId, data: { status: newStatus } })
  }

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket)
    setDetailModalOpen(true)
  }

  const tickets = ticketsData?.tickets || []
  const totalTickets = ticketsData?.total || 0

  // Calculate stats
  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const breachedCount = tickets.filter(t => t.sla_breached).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Support Tickets</h3>
          <p className="text-sm text-slate-500">
            {totalTickets} total ticket{totalTickets !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Open</p>
            <p className="text-2xl font-bold text-blue-600">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-purple-600">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">SLA Breached</p>
            <p className="text-2xl font-bold text-red-600">{breachedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-800">{totalTickets}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No tickets found for this customer
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className={`cursor-pointer hover:bg-slate-50 ${ticket.sla_breached ? 'bg-red-50' : ''}`}
                    onClick={() => handleViewTicket(ticket)}
                  >
                    <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                    <TableCell>{ticket.product}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PRIORITY_COLORS[ticket.priority]}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[ticket.status]}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.sla_breached ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Breached
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewTicket(ticket)}>
                            View Details
                          </DropdownMenuItem>
                          {ticket.status === 'open' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'in_progress')}>
                              Mark In Progress
                            </DropdownMenuItem>
                          )}
                          {ticket.status === 'in_progress' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'resolved')}>
                              Mark Resolved
                            </DropdownMenuItem>
                          )}
                          {ticket.status === 'resolved' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'closed')}>
                              Close Ticket
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTicketModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultCustomerId={customerId}
        onSuccess={() => {
          queryClient.invalidateQueries(['customer-tickets', customerId])
        }}
      />

      {selectedTicket && (
        <TicketDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          ticket={selectedTicket}
          onUpdate={() => {
            queryClient.invalidateQueries(['customer-tickets', customerId])
          }}
        />
      )}
    </div>
  )
}
