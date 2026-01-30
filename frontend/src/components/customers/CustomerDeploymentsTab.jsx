import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deploymentsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Server,
  Cloud,
  Laptop,
  Loader2,
} from 'lucide-react'

const PRODUCTS = ['MonetX', 'SupportX', 'GreenX']
const ENVIRONMENTS = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'on_premise', label: 'On-Premise' },
  { value: 'hybrid', label: 'Hybrid' },
]
const LICENSE_TYPES = ['enterprise', 'professional', 'starter', 'trial']

const productColors = {
  MonetX: 'bg-purple-100 text-purple-700',
  SupportX: 'bg-pink-100 text-pink-700',
  GreenX: 'bg-emerald-100 text-emerald-700',
}

const environmentIcons = {
  cloud: Cloud,
  on_premise: Server,
  hybrid: Laptop,
}

const environmentLabels = {
  cloud: 'Cloud',
  on_premise: 'On-Premise',
  hybrid: 'Hybrid',
}

const statusColors = {
  active: 'success',
  expired: 'danger',
  pending: 'warning',
  suspended: 'secondary',
}

const initialFormState = {
  product_name: '',
  version: '',
  environment: 'cloud',
  license_type: 'enterprise',
  deployment_date: '',
  license_expiry: '',
}

export function CustomerDeploymentsTab({ customer }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDeployment, setEditingDeployment] = useState(null)
  const [formData, setFormData] = useState(initialFormState)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deploymentToDelete, setDeploymentToDelete] = useState(null)
  const customerId = customer?.id

  // Fetch deployments
  const { data, isLoading } = useQuery({
    queryKey: ['customer-deployments', customerId],
    queryFn: () => deploymentsAPI.getAll({ customer_id: customerId }).then(res => res.data),
    enabled: !!customerId,
  })

  const deployments = data?.deployments || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => deploymentsAPI.create({ ...data, customer_id: customer.id }),
    onSuccess: () => {
      toast.success('Deployment Added', 'The deployment has been added successfully.')
      queryClient.invalidateQueries(['customer-deployments', customer.id])
      closeModal()
    },
    onError: () => {
      toast.error('Error', 'Failed to add deployment.')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => deploymentsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Deployment Updated', 'The deployment has been updated successfully.')
      queryClient.invalidateQueries(['customer-deployments', customer.id])
      closeModal()
    },
    onError: () => {
      toast.error('Error', 'Failed to update deployment.')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deploymentsAPI.delete(id),
    onSuccess: () => {
      toast.success('Deployment Deleted', 'The deployment has been deleted successfully.')
      queryClient.invalidateQueries(['customer-deployments', customer.id])
      setDeleteDialogOpen(false)
      setDeploymentToDelete(null)
    },
    onError: () => {
      toast.error('Error', 'Failed to delete deployment.')
    },
  })

  const openModal = (deployment = null) => {
    if (deployment) {
      setEditingDeployment(deployment)
      setFormData({
        product_name: deployment.product_name || '',
        version: deployment.version || '',
        environment: deployment.environment || 'production',
        license_type: deployment.license_type || 'enterprise',
        deployment_date: deployment.deployment_date?.split('T')[0] || '',
        license_expiry: deployment.license_expiry?.split('T')[0] || '',
      })
    } else {
      setEditingDeployment(null)
      setFormData(initialFormState)
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingDeployment(null)
    setFormData(initialFormState)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingDeployment) {
      updateMutation.mutate({ id: editingDeployment.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (deployment) => {
    setDeploymentToDelete(deployment)
    setDeleteDialogOpen(true)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Product Deployments</CardTitle>
          <Button onClick={() => openModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Deployment
          </Button>
        </CardHeader>
        <CardContent>
          {deployments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Environment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      License
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Expiry
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deployments.map((deployment) => {
                    const EnvIcon = environmentIcons[deployment.environment] || Server
                    const daysUntilExpiry = deployment.license_expiry
                      ? Math.ceil((new Date(deployment.license_expiry) - new Date()) / (1000 * 60 * 60 * 24))
                      : null
                    const status = !deployment.is_active
                      ? 'suspended'
                      : daysUntilExpiry === null
                      ? 'active'
                      : daysUntilExpiry <= 0
                      ? 'expired'
                      : daysUntilExpiry <= 30
                      ? 'pending'
                      : 'active'

                    return (
                      <tr key={deployment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${
                            productColors[deployment.product_name] || 'bg-slate-100 text-slate-700'
                          }`}>
                            {deployment.product_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {deployment.version || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EnvIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {environmentLabels[deployment.environment] || deployment.environment}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                          {deployment.license_type || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {deployment.license_expiry ? (
                            <div>
                              <div className="text-sm text-slate-600">
                                {new Date(deployment.license_expiry).toLocaleDateString()}
                              </div>
                              {daysUntilExpiry !== null && (
                                <div className={`text-xs ${
                                  daysUntilExpiry <= 0
                                    ? 'text-danger'
                                    : daysUntilExpiry <= 30
                                    ? 'text-warning'
                                    : 'text-slate-500'
                                }`}>
                                  {daysUntilExpiry <= 0 ? 'Expired' : `${daysUntilExpiry} days`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusColors[status]}>
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openModal(deployment)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(deployment)}
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
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Server className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No deployments yet</p>
              <p className="text-sm text-slate-400 mb-4">Add a product deployment to get started</p>
              <Button onClick={() => openModal()} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Deployment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Deployment Modal */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDeployment ? 'Edit Deployment' : 'Add Deployment'}
            </DialogTitle>
            <DialogDescription>
              {editingDeployment ? 'Update the deployment details below.' : 'Add a new product deployment for this customer.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product <span className="text-danger">*</span>
              </label>
              <Select
                value={formData.product_name}
                onValueChange={(value) => setFormData({ ...formData, product_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Version
              </label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., 2.5.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Environment
              </label>
              <Select
                value={formData.environment}
                onValueChange={(value) => setFormData({ ...formData, environment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((env) => (
                    <SelectItem key={env.value} value={env.value}>
                      {env.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                License Type
              </label>
              <Select
                value={formData.license_type}
                onValueChange={(value) => setFormData({ ...formData, license_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deployment Date <span className="text-danger">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.deployment_date}
                  onChange={(e) => setFormData({ ...formData, deployment_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  License Expiry <span className="text-danger">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.product_name || !formData.deployment_date || !formData.license_expiry || !formData.version}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingDeployment ? 'Save Changes' : 'Add Deployment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Deployment</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <p className="text-slate-600">
            Are you sure you want to delete the <strong>{deploymentToDelete?.product_name}</strong> deployment?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate(deploymentToDelete?.id)}
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
