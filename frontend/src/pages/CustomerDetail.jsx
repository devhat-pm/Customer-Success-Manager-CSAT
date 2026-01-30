import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersAPI, csatAPI, alertsAPI } from '@/services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoader } from '@/components/layout/LoadingSpinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import {
  HealthScoreCard,
  CustomerFormModal,
  CustomerOverviewTab,
  CustomerDeploymentsTab,
  CustomerHealthTab,
  CustomerCSATTab,
  CustomerInteractionsTab,
  CustomerTicketsTab,
  CustomerAlertsTab,
} from '@/components/customers'
import { SurveyLinkModal } from '@/components/csat'
import {
  ArrowLeft,
  Edit,
  MoreVertical,
  Plus,
  MessageSquare,
  Send,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  Star,
  Bell,
  Ticket,
  Trash2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/contexts/ToastContext'

const statusColors = {
  active: 'success',
  at_risk: 'warning',
  churned: 'danger',
  onboarding: 'secondary',
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [surveyModalOpen, setSurveyModalOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => customersAPI.delete(id),
    onSuccess: () => {
      toast.success('Customer Deleted', 'The customer has been deleted successfully.')
      queryClient.invalidateQueries(['customers'])
      navigate('/customers')
    },
    onError: () => {
      toast.error('Error', 'Failed to delete customer.')
    },
  })

  // Check if creating new customer
  const isNewCustomer = id === 'new'

  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview'

  // Handle tab change
  const handleTabChange = (tab) => {
    setSearchParams({ tab })
  }

  // Fetch customer detail (includes customer, deployments, health, csat, alerts)
  const { data: customerDetail, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersAPI.getById(id).then(res => res.data),
    enabled: !!id && !isNewCustomer,
  })

  // Extract data from the nested response
  const customer = customerDetail?.customer || customerDetail
  const csatSummary = customerDetail?.csat_summary
  const overallHealth = customerDetail?.overall_health_score

  // Fetch health history for previous score
  const { data: healthData } = useQuery({
    queryKey: ['customer-health-latest', id],
    queryFn: () => customersAPI.getHealthHistory(id, { limit: 2 }).then(res => res.data),
    enabled: !!id && !isNewCustomer,
  })

  // Fetch alerts count
  const { data: alertsData } = useQuery({
    queryKey: ['customer-alerts-count', id],
    queryFn: () => alertsAPI.getByCustomer(id, { is_resolved: false, limit: 1 }).then(res => res.data),
    enabled: !!id && !isNewCustomer,
  })

  // Handle new customer creation
  if (isNewCustomer) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Add New Customer</h1>
        </div>
        <CustomerFormModal
          open={true}
          onClose={() => navigate('/customers')}
          customer={null}
        />
      </div>
    )
  }

  if (isLoading) {
    return <PageLoader text="Loading customer details..." />
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">Customer not found</p>
        <Button variant="outline" onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </div>
    )
  }

  // Get health scores - prefer from detail response, fallback to health history
  const latestHealth = healthData?.health_scores?.[0] || healthData?.history?.[0] || overallHealth
  const previousHealth = healthData?.health_scores?.[1] || healthData?.history?.[1]
  const daysUntilRenewal = customer.contract_end_date
    ? Math.ceil((new Date(customer.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center text-white text-xl font-bold">
              {customer.company_name?.charAt(0) || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{customer.company_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusColors[customer.status] || 'secondary'}>
                  {customer.status?.replace('_', ' ')}
                </Badge>
                {customer.industry && (
                  <span className="text-sm text-slate-500">{customer.industry}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditModalOpen(true)} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleTabChange('deployments')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Deployment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTabChange('interactions')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Log Interaction
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSurveyModalOpen(true)}>
                <Send className="w-4 h-4 mr-2" />
                Send Survey
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-danger focus:text-danger"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score Card */}
        <HealthScoreCard
          score={latestHealth?.overall_score || customer.health_score || 0}
          previousScore={previousHealth?.overall_score}
          customerId={customer.id}
        />

        {/* CSAT Score Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500">CSAT Score</h3>
              <Link
                to={`/customers/${customer.id}?tab=csat`}
                className="text-xs text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Star className="w-6 h-6 text-warning" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-800">
                    {csatSummary?.average_score?.toFixed(1) || csatSummary?.avg_csat?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-sm text-slate-400">/5</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{csatSummary?.total_surveys || 0} surveys</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Contract</h3>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(customer.contract_value || 0)}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {customer.contract_end_date ? (
                    <span className={daysUntilRenewal <= 30 ? 'text-danger font-medium' : 'text-slate-500'}>
                      {daysUntilRenewal > 0 ? `${daysUntilRenewal} days until renewal` : 'Contract expired'}
                    </span>
                  ) : (
                    <span className="text-slate-400">No end date set</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-800 truncate">
                  {customer.contact_name || 'No contact'}
                </span>
              </div>
              {customer.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a
                    href={`mailto:${customer.contact_email}`}
                    className="text-sm text-primary hover:underline truncate"
                  >
                    {customer.contact_email}
                  </a>
                </div>
              )}
              {customer.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a
                    href={`tel:${customer.contact_phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {customer.contact_phone}
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                <a href={`mailto:${customer.contact_email}`}>
                  <Mail className="w-3 h-3" />
                  Email
                </a>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                <a href={`tel:${customer.contact_phone}`}>
                  <Phone className="w-3 h-3" />
                  Call
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="csat">CSAT</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alerts
            {alertsData?.total > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-xs rounded-full flex items-center justify-center">
                {alertsData.total}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CustomerOverviewTab customer={customer} />
        </TabsContent>

        <TabsContent value="deployments">
          <CustomerDeploymentsTab customer={customer} />
        </TabsContent>

        <TabsContent value="health">
          <CustomerHealthTab customer={customer} />
        </TabsContent>

        <TabsContent value="csat">
          <CustomerCSATTab customer={customer} />
        </TabsContent>

        <TabsContent value="interactions">
          <CustomerInteractionsTab customer={customer} />
        </TabsContent>

        <TabsContent value="tickets">
          <CustomerTicketsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="alerts">
          <CustomerAlertsTab customer={customer} />
        </TabsContent>
      </Tabs>

      {/* Edit Customer Modal */}
      <CustomerFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        customer={customer}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{customer.company_name}</strong>?
              This action cannot be undone and will remove all associated data including
              health scores, interactions, tickets, and alerts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Survey Modal */}
      <SurveyLinkModal
        open={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        initialCustomerId={customer?.id}
      />
    </div>
  )
}
