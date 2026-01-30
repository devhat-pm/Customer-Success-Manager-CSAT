import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Users,
  Bell,
  FileText,
  Search,
  Package,
  MessageSquare,
  BarChart3,
  Inbox,
  FolderOpen,
  Calendar,
  Plus,
} from 'lucide-react'

const illustrations = {
  customers: Users,
  alerts: Bell,
  reports: FileText,
  search: Search,
  products: Package,
  interactions: MessageSquare,
  analytics: BarChart3,
  inbox: Inbox,
  files: FolderOpen,
  calendar: Calendar,
  default: Inbox,
}

const defaultMessages = {
  customers: {
    title: 'No customers yet',
    description: 'Get started by adding your first customer to track their success journey.',
    actionLabel: 'Add Customer',
  },
  alerts: {
    title: 'All caught up!',
    description: 'No alerts to show right now. We\'ll notify you when something needs your attention.',
    actionLabel: 'Configure Alerts',
  },
  reports: {
    title: 'No reports generated',
    description: 'Generate your first report to gain insights into customer success metrics.',
    actionLabel: 'Generate Report',
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria to find what you\'re looking for.',
    actionLabel: 'Clear Search',
  },
  interactions: {
    title: 'No interactions recorded',
    description: 'Start logging customer interactions to track engagement and build relationships.',
    actionLabel: 'Log Interaction',
  },
  analytics: {
    title: 'No data available',
    description: 'Once you have data, you\'ll see analytics and insights here.',
    actionLabel: 'Learn More',
  },
  default: {
    title: 'Nothing here yet',
    description: 'This section is empty. Get started by adding some content.',
    actionLabel: 'Get Started',
  },
}

function EmptyState({
  type = 'default',
  title,
  description,
  actionLabel,
  onAction,
  icon: CustomIcon,
  className,
  showAction = true,
  children,
}) {
  const Icon = CustomIcon || illustrations[type] || illustrations.default
  const defaultMessage = defaultMessages[type] || defaultMessages.default

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full blur-2xl" />
        <div className="relative p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full">
          <Icon className="w-12 h-12 text-slate-400" strokeWidth={1.5} />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        {title || defaultMessage.title}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        {description || defaultMessage.description}
      </p>

      {/* Action */}
      {showAction && onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="w-4 h-4" />
          {actionLabel || defaultMessage.actionLabel}
        </Button>
      )}

      {/* Custom content */}
      {children}
    </div>
  )
}

// Specialized empty states
function NoCustomersEmpty({ onAdd }) {
  return (
    <EmptyState
      type="customers"
      onAction={onAdd}
    />
  )
}

function NoAlertsEmpty({ onConfigure }) {
  return (
    <EmptyState
      type="alerts"
      onAction={onConfigure}
    />
  )
}

function NoSearchResultsEmpty({ query, onClear }) {
  return (
    <EmptyState
      type="search"
      title="No results found"
      description={query ? `We couldn't find anything matching "${query}". Try different keywords or filters.` : "Try adjusting your search or filter criteria."}
      actionLabel="Clear Search"
      onAction={onClear}
    />
  )
}

function NoReportsEmpty({ onGenerate }) {
  return (
    <EmptyState
      type="reports"
      onAction={onGenerate}
    />
  )
}

function NoInteractionsEmpty({ onAdd }) {
  return (
    <EmptyState
      type="interactions"
      onAction={onAdd}
    />
  )
}

function NoDataEmpty({ title, description }) {
  return (
    <EmptyState
      type="analytics"
      title={title}
      description={description}
      showAction={false}
    />
  )
}

// Inline empty state for smaller areas
function InlineEmptyState({ icon: Icon = Inbox, message, className }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-8 px-4 text-center',
      className
    )}>
      <Icon className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  )
}

export {
  EmptyState,
  NoCustomersEmpty,
  NoAlertsEmpty,
  NoSearchResultsEmpty,
  NoReportsEmpty,
  NoInteractionsEmpty,
  NoDataEmpty,
  InlineEmptyState,
}
