import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ticketsAPI } from '@/services/api'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Ticket,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

const PRODUCT_COLORS = {
  MonetX: 'bg-primary-100 text-primary-700',
  SupportX: 'bg-secondary-100 text-secondary-700',
  GreenX: 'bg-success-100 text-success-700',
}

export default function Tickets() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch tickets
  const { data: ticketsData, isLoading: ticketsLoading, refetch } = useQuery({
    queryKey: ['tickets', { search, statusFilter, priorityFilter, productFilter, page }],
    queryFn: () => {
      const params = {
        skip: (page - 1) * limit,
        limit,
        sort_by: 'created_at',
        sort_order: 'desc',
      }
      if (search) params.search = search
      if (statusFilter !== 'all') params.status = statusFilter
      if (priorityFilter !== 'all') params.priority = priorityFilter
      if (productFilter !== 'all') params.product = productFilter
      return ticketsAPI.getAll(params).then(res => res.data)
    },
  })

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['tickets-stats'],
    queryFn: () => ticketsAPI.getStats().then(res => res.data),
  })

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => ticketsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets'])
      queryClient.invalidateQueries(['tickets-stats'])
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

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setProductFilter('all')
    setPage(1)
  }

  const tickets = ticketsData?.tickets || []
  const totalTickets = ticketsData?.total || 0
  const totalPages = Math.ceil(totalTickets / limit)

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-slate-500">Manage and track customer support tickets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {statsLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">{stats?.total_tickets || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Open</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.open_tickets || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.in_progress_tickets || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Critical Open</p>
                <p className="text-2xl font-bold text-red-600">{stats?.critical_open_count || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">SLA Breached</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.sla_breach_count || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Avg Resolution</p>
                <p className="text-2xl font-bold text-slate-800">
                  {stats?.avg_resolution_time_hours ? `${stats.avg_resolution_time_hours.toFixed(1)}h` : '-'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="MonetX">MonetX</SelectItem>
                <SelectItem value="SupportX">SupportX</SelectItem>
                <SelectItem value="GreenX">GreenX</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(9).fill(0).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No tickets found
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
                    <TableCell>
                      {ticket.customer ? (
                        <span
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/customers/${ticket.customer_id}`)
                          }}
                        >
                          {ticket.customer.company_name}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PRODUCT_COLORS[ticket.product]}>
                        {ticket.product}
                      </Badge>
                    </TableCell>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalTickets)} of {totalTickets}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTicketModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries(['tickets'])
          queryClient.invalidateQueries(['tickets-stats'])
        }}
      />

      {selectedTicket && (
        <TicketDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          ticket={selectedTicket}
          onUpdate={() => {
            queryClient.invalidateQueries(['tickets'])
            queryClient.invalidateQueries(['tickets-stats'])
          }}
        />
      )}
    </div>
  )
}
