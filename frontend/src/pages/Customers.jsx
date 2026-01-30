import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { customersAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { generateCustomersPDF } from '@/lib/pdfExport'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CustomerFilters,
  CustomerTable,
  CustomerFormModal,
} from '@/components/customers'
import {
  Plus,
  Download,
  Trash2,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
} from 'lucide-react'

export default function Customers() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse URL params for filters
  const initialFilters = {
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    industry: searchParams.get('industry') || '',
    product: searchParams.get('product') || '',
    account_manager_id: searchParams.get('account_manager_id') || '',
  }

  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('company_name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [isExporting, setIsExporting] = useState(false)
  const limit = 10

  // Fetch customers
  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, filters, sortBy, sortOrder],
    queryFn: () =>
      customersAPI.getAll({
        skip: (page - 1) * limit,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        industry: filters.industry || undefined,
        product: filters.product || undefined,
        account_manager_id: filters.account_manager_id || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }).then(res => res.data),
  })

  // Transform customers to flatten health_score from latest_health_score
  const customers = (data?.customers || []).map(c => ({
    ...c,
    health_score: c.latest_health_score?.overall_score ?? c.health_score ?? null,
    score_trend: c.latest_health_score?.score_trend ?? c.score_trend ?? null,
  }))
  const total = data?.total || 0

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)
    setSelectedIds([])

    // Update URL params
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    setSearchParams(params)
  }, [setSearchParams])

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      industry: '',
      product: '',
      account_manager_id: '',
    }
    setFilters(clearedFilters)
    setPage(1)
    setSelectedIds([])
    setSearchParams(new URLSearchParams())
  }

  // Handle sort
  const handleSort = (column, order) => {
    setSortBy(column)
    setSortOrder(order)
    setPage(1)
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setPage(newPage)
    setSelectedIds([])
  }

  // Open modal for adding/editing
  const handleOpenModal = (customer = null) => {
    setEditingCustomer(customer)
    setModalOpen(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingCustomer(null)
  }

  // Fetch all customers for export
  const fetchAllCustomers = async () => {
    const response = await customersAPI.getAll({
      limit: 10000,
      search: filters.search || undefined,
      status: filters.status || undefined,
      industry: filters.industry || undefined,
      product: filters.product || undefined,
      account_manager_id: filters.account_manager_id || undefined,
    })

    const customersToExport = (response.data?.customers || []).map(c => ({
      ...c,
      health_score: c.latest_health_score?.overall_score ?? c.health_score ?? null,
      score_trend: c.latest_health_score?.score_trend ?? c.score_trend ?? null,
    }))

    return customersToExport
  }

  // Export to CSV
  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const customersToExport = await fetchAllCustomers()

      if (customersToExport.length === 0) {
        toast.warning('No Data', 'No customers to export.')
        return
      }

      // Create CSV content
      const headers = [
        'Company Name',
        'Industry',
        'Contact Name',
        'Contact Email',
        'Contact Phone',
        'Status',
        'Health Score',
        'Contract Value',
        'Contract Start',
        'Contract End',
        'Account Manager',
      ]

      const rows = customersToExport.map((c) => [
        c.company_name,
        c.industry || '',
        c.contact_name || '',
        c.contact_email || '',
        c.contact_phone || '',
        c.status || '',
        c.health_score || '',
        c.contract_value || '',
        c.contract_start_date || '',
        c.contract_end_date || '',
        c.account_manager_name || '',
      ])

      const csvContent =
        [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast.success('Export Complete', `Exported ${customersToExport.length} customers to CSV.`)
    } catch (error) {
      console.error('CSV export failed:', error)
      toast.error('Export Failed', 'Failed to export customers to CSV.')
    } finally {
      setIsExporting(false)
    }
  }

  // Export to PDF
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      toast.info('Generating PDF', 'Please wait while we generate your report...')

      const customersToExport = await fetchAllCustomers()

      if (customersToExport.length === 0) {
        toast.warning('No Data', 'No customers to export.')
        return
      }

      await generateCustomersPDF(customersToExport, {
        title: 'Customers Report',
        companyName: 'Success Manager',
        filters,
      })

      toast.success('Export Complete', `Exported ${customersToExport.length} customers to PDF.`)
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Export Failed', 'Failed to generate PDF report.')
    } finally {
      setIsExporting(false)
    }
  }

  // Bulk actions
  const handleBulkDelete = () => {
    toast.warning('Not Implemented', 'Bulk delete is not yet implemented.')
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500">Manage your customer portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CheckSquare className="w-4 h-4" />
                  {selectedIds.length} selected
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBulkDelete} className="text-danger">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting} className="gap-2">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export'}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {/* Results summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {isLoading ? 'Loading...' : `${total} customer${total !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* Table */}
      <CustomerTable
        customers={customers}
        total={total}
        page={page}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onPageChange={handlePageChange}
        onSort={handleSort}
        onEdit={handleOpenModal}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
      />

      {/* Add/Edit Modal */}
      <CustomerFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        customer={editingCustomer}
      />
    </div>
  )
}
