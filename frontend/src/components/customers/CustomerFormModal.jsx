import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersAPI, usersAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Government',
  'Non-profit',
  'Other',
]

const STATUSES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'churned', label: 'Churned' },
]

const PRODUCTS = [
  { value: 'MonetX', label: 'MonetX', description: 'Financial Management' },
  { value: 'SupportX', label: 'SupportX', description: 'Customer Support' },
  { value: 'GreenX', label: 'GreenX', description: 'Sustainability' },
]

const initialFormState = {
  company_name: '',
  industry: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  deployed_products: [],
  contract_start_date: '',
  contract_end_date: '',
  contract_value: '',
  account_manager_id: '',
  account_manager: '',
  status: 'onboarding',
  logo_url: '',
  notes: '',
}

export function CustomerFormModal({ open, onClose, customer }) {
  const isEditing = !!customer
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState({})

  // Fetch account managers (users who can manage customers)
  const { data: accountManagersData } = useQuery({
    queryKey: ['account-managers'],
    queryFn: () => customersAPI.getAccountManagers().then(res => res.data),
    enabled: open,
  })

  const accountManagers = accountManagersData || []

  // Initialize form with customer data when editing
  useEffect(() => {
    if (customer) {
      setFormData({
        company_name: customer.company_name || '',
        industry: customer.industry || '',
        contact_name: customer.contact_name || '',
        contact_email: customer.contact_email || '',
        contact_phone: customer.contact_phone || '',
        deployed_products: customer.deployed_products || [],
        contract_start_date: customer.contract_start_date?.split('T')[0] || '',
        contract_end_date: customer.contract_end_date?.split('T')[0] || '',
        contract_value: customer.contract_value?.toString() || '',
        account_manager_id: customer.account_manager_id || '',
        account_manager: customer.account_manager || '',
        status: customer.status || 'onboarding',
        logo_url: customer.logo_url || '',
        notes: customer.notes || '',
      })
    } else {
      setFormData(initialFormState)
    }
    setErrors({})
  }, [customer, open])

  const createMutation = useMutation({
    mutationFn: (data) => customersAPI.create(data),
    onSuccess: () => {
      toast.success('Customer Created', 'The customer has been created successfully.')
      queryClient.invalidateQueries(['customers'])
      onClose()
    },
    onError: (error) => {
      toast.error('Error', error.response?.data?.detail || 'Failed to create customer.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => customersAPI.update(customer.id, data),
    onSuccess: () => {
      toast.success('Customer Updated', 'The customer has been updated successfully.')
      queryClient.invalidateQueries(['customers'])
      queryClient.invalidateQueries(['customer', customer.id])
      onClose()
    },
    onError: (error) => {
      toast.error('Error', error.response?.data?.detail || 'Failed to update customer.')
    },
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const validateForm = () => {
    const newErrors = {}

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format'
    }

    if (formData.contract_start_date && formData.contract_end_date) {
      if (new Date(formData.contract_end_date) <= new Date(formData.contract_start_date)) {
        newErrors.contract_end_date = 'End date must be after start date'
      }
    }

    if (formData.contract_value && parseFloat(formData.contract_value) < 0) {
      newErrors.contract_value = 'Contract value must be positive'
    }

    if (formData.logo_url && !/^https?:\/\/.+/i.test(formData.logo_url)) {
      newErrors.logo_url = 'Must be a valid URL starting with http:// or https://'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) return

    const submitData = {
      company_name: formData.company_name,
      industry: formData.industry || null,
      contact_name: formData.contact_name || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      deployed_products: formData.deployed_products,
      contract_start_date: formData.contract_start_date || null,
      contract_end_date: formData.contract_end_date || null,
      contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
      account_manager_id: formData.account_manager_id || null,
      account_manager: formData.account_manager || null,
      status: formData.status,
      logo_url: formData.logo_url || null,
      notes: formData.notes || null,
    }

    if (isEditing) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleProductToggle = (product) => {
    setFormData((prev) => {
      const products = prev.deployed_products || []
      if (products.includes(product)) {
        return { ...prev, deployed_products: products.filter(p => p !== product) }
      } else {
        return { ...prev, deployed_products: [...products, product] }
      }
    })
  }

  const handleAccountManagerChange = (userId) => {
    const manager = accountManagers.find(m => m.id === userId)
    setFormData((prev) => ({
      ...prev,
      account_manager_id: userId,
      account_manager: manager?.full_name || ''
    }))
    if (errors.account_manager_id) {
      setErrors((prev) => ({ ...prev, account_manager_id: undefined }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the customer information below.' : 'Fill in the details to add a new customer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Name <span className="text-danger">*</span>
              </label>
              <Input
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Enter company name"
                className={errors.company_name ? 'border-danger' : ''}
              />
              {errors.company_name && (
                <p className="text-xs text-danger mt-1">{errors.company_name}</p>
              )}
            </div>

            {/* Logo URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Logo URL
              </label>
              <Input
                value={formData.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
                className={errors.logo_url ? 'border-danger' : ''}
              />
              {errors.logo_url && (
                <p className="text-xs text-danger mt-1">{errors.logo_url}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Industry
              </label>
              <Select
                value={formData.industry}
                onValueChange={(value) => handleChange('industry', value)}
              >
                <SelectTrigger className={errors.industry ? 'border-danger' : ''}>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industry && (
                <p className="text-xs text-danger mt-1">{errors.industry}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deployed Products */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Deployed Products
              </label>
              <div className="flex flex-wrap gap-4">
                {PRODUCTS.map((product) => (
                  <div key={product.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${product.value}`}
                      checked={(formData.deployed_products || []).includes(product.value)}
                      onCheckedChange={() => handleProductToggle(product.value)}
                    />
                    <label
                      htmlFor={`product-${product.value}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {product.label}
                      <span className="text-xs text-slate-500 ml-1">({product.description})</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Name
              </label>
              <Input
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                placeholder="Enter contact name"
                className={errors.contact_name ? 'border-danger' : ''}
              />
              {errors.contact_name && (
                <p className="text-xs text-danger mt-1">{errors.contact_name}</p>
              )}
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Email
              </label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                placeholder="Enter contact email"
                className={errors.contact_email ? 'border-danger' : ''}
              />
              {errors.contact_email && (
                <p className="text-xs text-danger mt-1">{errors.contact_email}</p>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="Enter contact phone"
              />
            </div>

            {/* Account Manager */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Manager
              </label>
              <Select
                value={formData.account_manager_id}
                onValueChange={handleAccountManagerChange}
              >
                <SelectTrigger className={errors.account_manager_id ? 'border-danger' : ''}>
                  <SelectValue placeholder="Select account manager" />
                </SelectTrigger>
                <SelectContent>
                  {accountManagers.length > 0 ? (
                    accountManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name} ({manager.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No account managers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.account_manager_id && (
                <p className="text-xs text-danger mt-1">{errors.account_manager_id}</p>
              )}
            </div>

            {/* Contract Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contract Start Date
              </label>
              <Input
                type="date"
                value={formData.contract_start_date}
                onChange={(e) => handleChange('contract_start_date', e.target.value)}
                className={errors.contract_start_date ? 'border-danger' : ''}
              />
              {errors.contract_start_date && (
                <p className="text-xs text-danger mt-1">{errors.contract_start_date}</p>
              )}
            </div>

            {/* Contract End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contract End Date
              </label>
              <Input
                type="date"
                value={formData.contract_end_date}
                onChange={(e) => handleChange('contract_end_date', e.target.value)}
                className={errors.contract_end_date ? 'border-danger' : ''}
              />
              {errors.contract_end_date && (
                <p className="text-xs text-danger mt-1">{errors.contract_end_date}</p>
              )}
            </div>

            {/* Contract Value */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contract Value
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.contract_value}
                onChange={(e) => handleChange('contract_value', e.target.value)}
                placeholder="Enter contract value"
                className={errors.contract_value ? 'border-danger' : ''}
              />
              {errors.contract_value && (
                <p className="text-xs text-danger mt-1">{errors.contract_value}</p>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Enter any additional notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
