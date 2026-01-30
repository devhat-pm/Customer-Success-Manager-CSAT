import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Help icon with tooltip for explaining complex metrics
function HelpTooltip({ content, side = 'top', className, size = 'default' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full',
              className
            )}
            aria-label="Help information"
          >
            <HelpCircle className={sizeClasses[size]} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Info tooltip for additional context
function InfoTooltip({ content, side = 'top', className, size = 'default' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center text-primary/60 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full',
              className
            )}
            aria-label="Additional information"
          >
            <Info className={sizeClasses[size]} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Warning tooltip for alerts or cautionary information
function WarningTooltip({ content, side = 'top', className, size = 'default' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center text-warning hover:text-warning-700 transition-colors focus:outline-none focus:ring-2 focus:ring-warning/20 rounded-full',
              className
            )}
            aria-label="Warning information"
          >
            <AlertCircle className={sizeClasses[size]} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Predefined metric explanations
const metricExplanations = {
  healthScore: 'The health score is calculated based on product usage, engagement, support tickets, and CSAT responses. Higher scores indicate healthier customer relationships.',
  nps: 'Net Promoter Score measures customer loyalty. Score ranges from -100 to 100. Above 50 is excellent, 0-50 is good, below 0 needs attention.',
  csat: 'Customer Satisfaction Score represents the average satisfaction rating from customer surveys on a scale of 1-5.',
  arr: 'Annual Recurring Revenue represents the annualized value of active subscriptions.',
  mrr: 'Monthly Recurring Revenue is the predictable revenue generated each month from subscriptions.',
  churnRate: 'Churn rate indicates the percentage of customers who stopped using the service during a specific period.',
  retentionRate: 'Retention rate shows the percentage of customers who continue using the service over time.',
  ltv: 'Customer Lifetime Value estimates the total revenue a customer will generate during their relationship with your company.',
  engagementScore: 'Engagement score measures how actively customers use your product based on login frequency, feature usage, and interaction patterns.',
}

// Pre-built help tooltip for common metrics
function MetricHelp({ metric, side = 'top', className }) {
  const explanation = metricExplanations[metric]

  if (!explanation) {
    console.warn(`No explanation found for metric: ${metric}`)
    return null
  }

  return (
    <HelpTooltip
      content={explanation}
      side={side}
      className={className}
      size="sm"
    />
  )
}

export {
  HelpTooltip,
  InfoTooltip,
  WarningTooltip,
  MetricHelp,
  metricExplanations,
}
