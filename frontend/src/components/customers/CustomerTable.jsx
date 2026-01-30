import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react'
import { formatCurrency, getHealthStatusColor } from '@/lib/utils'

const statusColors = {
  active: 'success',
  at_risk: 'warning',
  churned: 'danger',
  onboarding: 'secondary',
}

const productColors = {
  MonetX: 'bg-purple-100 text-purple-700',
  SupportX: 'bg-pink-100 text-pink-700',
  GreenX: 'bg-emerald-100 text-emerald-700',
}

export function CustomerTable({
  customers,
  total,
  page,
  limit,
  sortBy,
  sortOrder,
  onPageChange,
  onSort,
  onEdit,
  isLoading,
  selectedIds,
  onSelectChange,
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)

  const totalPages = Math.ceil(total / limit)

  const deleteMutation = useMutation({
    mutationFn: (id) => customersAPI.delete(id),
    onSuccess: () => {
      toast.success('Customer Deleted', 'The customer has been deleted successfully.')
      queryClient.invalidateQueries(['customers'])
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    },
    onError: () => {
      toast.error('Error', 'Failed to delete customer.')
    },
  })

  const handleSort = (column) => {
    if (sortBy === column) {
      onSort(column, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(column, 'asc')
    }
  }

  const handleDelete = (customer) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id)
    }
  }

  const handleRowClick = (customerId) => {
    navigate(`/customers/${customerId}`)
  }

  const handleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      onSelectChange([])
    } else {
      onSelectChange(customers.map(c => c.id))
    }
  }

  const handleSelectOne = (id, e) => {
    e.stopPropagation()
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter(i => i !== id))
    } else {
      onSelectChange([...selectedIds, id])
    }
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  const SelectIcon = () => {
    if (selectedIds.length === 0) return <Square className="w-4 h-4" />
    if (selectedIds.length === customers.length) return <CheckSquare className="w-4 h-4" />
    return <MinusSquare className="w-4 h-4" />
  }

  if (isLoading) {
    return <CustomerTableSkeleton />
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-12 px-4 py-3">
                  <button
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <SelectIcon />
                  </button>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('company_name')}
                >
                  <div className="flex items-center gap-1">
                    Company Name
                    <SortIcon column="company_name" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Products
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('health_score')}
                >
                  <div className="flex items-center gap-1">
                    Health Score
                    <SortIcon column="health_score" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('contract_value')}
                >
                  <div className="flex items-center gap-1">
                    Contract Value
                    <SortIcon column="contract_value" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('contract_end_date')}
                >
                  <div className="flex items-center gap-1">
                    Renewal
                    <SortIcon column="contract_end_date" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Account Manager
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => {
                const daysUntilRenewal = customer.contract_end_date
                  ? Math.ceil((new Date(customer.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <tr
                    key={customer.id}
                    onClick={() => handleRowClick(customer.id)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      selectedIds.includes(customer.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => handleSelectOne(customer.id, e)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {selectedIds.includes(customer.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{customer.company_name}</div>
                      <div className="text-xs text-slate-500">{customer.contact_email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {customer.industry || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.products?.map((product) => (
                          <span
                            key={product}
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              productColors[product] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {product}
                          </span>
                        ))}
                        {(!customer.products || customer.products.length === 0) && (
                          <span className="text-xs text-slate-400">No products</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.health_score !== null ? (
                        <Badge variant={getHealthStatusColor(customer.health_score)}>
                          {customer.health_score}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {formatCurrency(customer.contract_value || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {customer.contract_end_date ? (
                        <div>
                          <div className="text-sm text-slate-600">
                            {new Date(customer.contract_end_date).toLocaleDateString()}
                          </div>
                          <div
                            className={`text-xs ${
                              daysUntilRenewal <= 30
                                ? 'text-danger font-medium'
                                : daysUntilRenewal <= 60
                                ? 'text-warning'
                                : 'text-slate-500'
                            }`}
                          >
                            {daysUntilRenewal > 0 ? `${daysUntilRenewal} days` : 'Expired'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[customer.status] || 'secondary'}>
                        {customer.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {customer.account_manager_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}`); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(customer); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDelete(customer); }}
                            className="text-danger focus:text-danger"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
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
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{customerToDelete?.company_name}</strong>?
              This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CustomerTableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {Array.from({ length: 10 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
