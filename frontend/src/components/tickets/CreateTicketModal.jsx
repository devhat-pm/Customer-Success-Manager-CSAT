import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ticketsAPI, customersAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineLoader } from '@/components/layout/LoadingSpinner'

const ticketSchema = z.object({
  customer_id: z.string().uuid('Please select a customer'),
  subject: z.string().min(1, 'Subject is required').max(255),
  description: z.string().optional(),
  product: z.enum(['MonetX', 'SupportX', 'GreenX'], {
    required_error: 'Please select a product',
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

export function CreateTicketModal({ open, onOpenChange, onSuccess, defaultCustomerId }) {
  const { showToast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      customer_id: defaultCustomerId || '',
      subject: '',
      description: '',
      product: undefined,
      priority: 'medium',
    },
  })

  // Fetch customers for dropdown
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersAPI.getAll({ limit: 1000 }).then(res => res.data),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (data) => ticketsAPI.create(data),
    onSuccess: () => {
      showToast('Ticket created successfully', 'success')
      reset()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      showToast(error.response?.data?.detail || 'Failed to create ticket', 'error')
    },
  })

  const onSubmit = (data) => {
    createMutation.mutate(data)
  }

  const customers = customersData?.customers || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Create a new support ticket for a customer. The ticket number will be auto-generated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <Select
              value={watch('customer_id')}
              onValueChange={(value) => setValue('customer_id', value)}
              disabled={!!defaultCustomerId}
            >
              <SelectTrigger>
                <SelectValue placeholder={customersLoading ? 'Loading...' : 'Select customer'} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customer_id && (
              <p className="text-sm text-red-500">{errors.customer_id.message}</p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of the issue"
              {...register('subject')}
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the issue..."
              rows={4}
              {...register('description')}
            />
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label htmlFor="product">Product *</Label>
            <Select
              value={watch('product')}
              onValueChange={(value) => setValue('product', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MonetX">MonetX</SelectItem>
                <SelectItem value="SupportX">SupportX</SelectItem>
                <SelectItem value="GreenX">GreenX</SelectItem>
              </SelectContent>
            </Select>
            {errors.product && (
              <p className="text-sm text-red-500">{errors.product.message}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={watch('priority')}
              onValueChange={(value) => setValue('priority', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (72h SLA)</SelectItem>
                <SelectItem value="medium">Medium (24h SLA)</SelectItem>
                <SelectItem value="high">High (8h SLA)</SelectItem>
                <SelectItem value="critical">Critical (4h SLA)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              SLA will be tracked automatically based on priority
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {(isSubmitting || createMutation.isPending) ? (
                <>
                  <InlineLoader className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
