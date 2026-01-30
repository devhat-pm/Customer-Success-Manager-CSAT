import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersAPI } from '@/services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Activity,
  Star,
  Users,
  Briefcase,
  FileText,
  Download,
  Clock,
  Loader2,
} from 'lucide-react'

const reportIcons = {
  health_summary: Activity,
  csat_analysis: Star,
  customer_overview: Users,
  executive_summary: Briefcase,
}

const reportColors = {
  health_summary: 'bg-success/10 text-success',
  csat_analysis: 'bg-warning/10 text-warning',
  customer_overview: 'bg-primary/10 text-primary',
  executive_summary: 'bg-purple-500/10 text-purple-500',
}

export function QuickReportCard({
  type,
  title,
  description,
  lastGenerated,
  onGenerate,
  isGenerating = false,
  requiresCustomer = false,
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const Icon = reportIcons[type] || FileText
  const colorClasses = reportColors[type] || 'bg-slate-100 text-slate-600'

  // Fetch customers if this report requires customer selection
  const { data: customersData } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => customersAPI.getAll({ limit: 100 }).then(res => res.data),
    enabled: requiresCustomer,
  })

  const customers = customersData?.customers || []

  const handleGenerate = () => {
    if (requiresCustomer && !selectedCustomerId) return
    onGenerate?.(type, requiresCustomer ? selectedCustomerId : null)
  }

  const getLastGeneratedText = () => {
    if (!lastGenerated) return null
    try {
      return formatDistanceToNow(parseISO(lastGenerated), { addSuffix: true })
    } catch {
      return null
    }
  }

  const lastGeneratedText = getLastGeneratedText()

  return (
    <Card className="card-hover h-full">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Icon and Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl ${colorClasses}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {/* Customer Selection (if required) */}
        {requiresCustomer && (
          <div className="mb-4">
            <Select
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Last Generated Info */}
        {lastGeneratedText && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
            <Clock className="w-3 h-3" />
            <span>Last generated {lastGeneratedText}</span>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (requiresCustomer && !selectedCustomerId)}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function QuickReportCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}
