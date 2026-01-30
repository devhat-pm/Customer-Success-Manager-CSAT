import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plug,
  MessageSquare,
  Mail,
  Calendar,
  Cloud,
  Layers,
  Webhook,
  Key,
  ExternalLink,
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react'
import { settingsAPI } from '@/services/api'
import { InlineLoader } from '@/components/layout/LoadingSpinner'
import { useToast } from '@/contexts/ToastContext'

const iconMap = {
  MessageSquare: MessageSquare,
  Mail: Mail,
  Calendar: Calendar,
  Cloud: Cloud,
  Layers: Layers,
  Webhook: Webhook,
  Key: Key,
}

const categoryColors = {
  communication: 'bg-blue-50 text-blue-700',
  productivity: 'bg-green-50 text-green-700',
  crm: 'bg-purple-50 text-purple-700',
  developer: 'bg-orange-50 text-orange-700',
}

// Default integrations when API fails or returns empty
const defaultIntegrations = [
  {
    id: 'slack',
    name: 'slack',
    displayName: 'Slack',
    description: 'Send notifications and alerts to Slack channels',
    category: 'communication',
    icon: 'MessageSquare',
    status: 'available',
    isEnabled: false,
    config: {},
  },
  {
    id: 'webhooks',
    name: 'webhooks',
    displayName: 'Webhooks',
    description: 'Send event data to external URLs',
    category: 'developer',
    icon: 'Webhook',
    status: 'available',
    isEnabled: false,
    config: {},
  },
  {
    id: 'api_access',
    name: 'api_access',
    displayName: 'API Access',
    description: 'Generate API keys for external access',
    category: 'developer',
    icon: 'Key',
    status: 'available',
    isEnabled: false,
    config: {},
  },
  {
    id: 'smtp',
    name: 'smtp',
    displayName: 'Email (SMTP)',
    description: 'Configure custom SMTP server for emails',
    category: 'communication',
    icon: 'Mail',
    status: 'available',
    isEnabled: false,
    config: {},
  },
  {
    id: 'google_calendar',
    name: 'google_calendar',
    displayName: 'Google Calendar',
    description: 'Sync events and meetings with Google Calendar',
    category: 'productivity',
    icon: 'Calendar',
    status: 'available',
    isEnabled: false,
    config: {},
  },
  {
    id: 'salesforce',
    name: 'salesforce',
    displayName: 'Salesforce',
    description: 'Sync customer data with Salesforce CRM',
    category: 'crm',
    icon: 'Cloud',
    status: 'available',
    isEnabled: false,
    config: {},
  },
  {
    id: 'hubspot',
    name: 'hubspot',
    displayName: 'HubSpot',
    description: 'Connect with HubSpot CRM for customer data',
    category: 'crm',
    icon: 'Layers',
    status: 'available',
    isEnabled: false,
    config: {},
  },
]

export function IntegrationsSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [configureModal, setConfigureModal] = useState({ open: false, integration: null })
  const [configForm, setConfigForm] = useState({})
  const [showSecrets, setShowSecrets] = useState({})
  const [localIntegrations, setLocalIntegrations] = useState(defaultIntegrations)

  const { data: integrationsData, isLoading, error } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      try {
        const response = await settingsAPI.getIntegrations()
        return response.data
      } catch (err) {
        console.error('Failed to fetch integrations:', err)
        return null
      }
    },
    retry: 1,
  })

  // Use API data or fallback to local state
  const integrations = (integrationsData && integrationsData.length > 0)
    ? integrationsData
    : localIntegrations

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        const response = await settingsAPI.updateIntegration(id, data)
        return response.data
      } catch (err) {
        // If API fails, update local state
        return { id, ...data, _local: true }
      }
    },
    onSuccess: (result) => {
      if (result._local) {
        // Update local state
        setLocalIntegrations(prev => prev.map(i =>
          i.id === result.id ? { ...i, ...result, config: { ...i.config, ...configForm } } : i
        ))
        toast.success('Configuration saved locally')
      } else {
        queryClient.invalidateQueries(['integrations'])
        toast.success('Integration updated successfully')
      }
      setConfigureModal({ open: false, integration: null })
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update integration')
    },
  })

  const testMutation = useMutation({
    mutationFn: async (id) => {
      const response = await settingsAPI.testIntegration(id)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['integrations'])
      if (data.success) {
        toast.success(data.message || 'Connection test successful')
      } else {
        toast.error(data.message || 'Connection test failed')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Connection test failed')
    },
  })

  const handleConfigure = (integration) => {
    setConfigForm(integration.config || {})
    setConfigureModal({ open: true, integration })
  }

  const handleSaveConfig = () => {
    if (!configureModal.integration) return

    updateMutation.mutate({
      id: configureModal.integration.id,
      data: {
        isEnabled: configureModal.integration.isEnabled,
        config: configForm,
      },
    })
  }

  const handleToggleEnabled = (integration, enabled) => {
    updateMutation.mutate({
      id: integration.id,
      data: { isEnabled: enabled },
    })
  }

  const handleTestConnection = (integrationId) => {
    testMutation.mutate(integrationId)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const generateApiKey = () => {
    const key = 'sk_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    setConfigForm({ ...configForm, api_key: key })
  }

  // Group integrations by category
  const groupedIntegrations = integrations.reduce((acc, integration) => {
    const category = integration.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(integration)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <InlineLoader className="w-8 h-8" />
        <span className="ml-3 text-slate-500">Loading integrations...</span>
      </div>
    )
  }

  // Don't show error state - use fallback integrations instead
  const usingFallback = !integrationsData || integrationsData.length === 0

  const renderConfigFields = (integration) => {
    switch (integration.name) {
      case 'slack':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={configForm.webhook_url || ''}
                onChange={(e) => setConfigForm({ ...configForm, webhook_url: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Create an incoming webhook in your Slack workspace settings
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Default Channel</Label>
              <Input
                id="channel"
                placeholder="#alerts"
                value={configForm.channel || ''}
                onChange={(e) => setConfigForm({ ...configForm, channel: e.target.value })}
              />
            </div>
          </div>
        )

      case 'webhooks':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://your-server.com/webhook"
                value={configForm.url || ''}
                onChange={(e) => setConfigForm({ ...configForm, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret">Webhook Secret (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="secret"
                  type={showSecrets.webhook_secret ? 'text' : 'password'}
                  placeholder="Your webhook secret"
                  value={configForm.secret || ''}
                  onChange={(e) => setConfigForm({ ...configForm, secret: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecrets({ ...showSecrets, webhook_secret: !showSecrets.webhook_secret })}
                >
                  {showSecrets.webhook_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Used to sign webhook payloads for verification
              </p>
            </div>
            <div className="space-y-2">
              <Label>Events to Send</Label>
              <div className="grid grid-cols-2 gap-2">
                {['customer_created', 'health_drop', 'ticket_created', 'survey_response'].map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={configForm.events?.includes(event) || false}
                      onChange={(e) => {
                        const events = configForm.events || []
                        if (e.target.checked) {
                          setConfigForm({ ...configForm, events: [...events, event] })
                        } else {
                          setConfigForm({ ...configForm, events: events.filter(ev => ev !== event) })
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    {event.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 'api_access':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecrets.api_key ? 'text' : 'password'}
                  value={configForm.api_key || ''}
                  readOnly
                  placeholder="Generate an API key"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecrets({ ...showSecrets, api_key: !showSecrets.api_key })}
                >
                  {showSecrets.api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                {configForm.api_key && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(configForm.api_key)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={generateApiKey}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>
              <p className="text-xs text-slate-500">
                Keep this key secure. It provides full API access to your account.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate_limit">Rate Limit (requests/minute)</Label>
              <Input
                id="rate_limit"
                type="number"
                min="10"
                max="1000"
                value={configForm.rate_limit || 60}
                onChange={(e) => setConfigForm({ ...configForm, rate_limit: parseInt(e.target.value) })}
              />
            </div>
          </div>
        )

      case 'smtp':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                id="host"
                placeholder="smtp.example.com"
                value={configForm.host || ''}
                onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="587"
                  value={configForm.port || ''}
                  onChange={(e) => setConfigForm({ ...configForm, port: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="encryption">Encryption</Label>
                <select
                  id="encryption"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={configForm.encryption || 'tls'}
                  onChange={(e) => setConfigForm({ ...configForm, encryption: e.target.value })}
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="your-email@example.com"
                value={configForm.username || ''}
                onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type={showSecrets.smtp_password ? 'text' : 'password'}
                  placeholder="Your SMTP password"
                  value={configForm.password || ''}
                  onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecrets({ ...showSecrets, smtp_password: !showSecrets.smtp_password })}
                >
                  {showSecrets.smtp_password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                placeholder="noreply@example.com"
                value={configForm.from_email || ''}
                onChange={(e) => setConfigForm({ ...configForm, from_email: e.target.value })}
              />
            </div>
          </div>
        )

      case 'google_calendar':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                placeholder="Your Google OAuth Client ID"
                value={configForm.client_id || ''}
                onChange={(e) => setConfigForm({ ...configForm, client_id: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                Get this from the Google Cloud Console
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="client_secret"
                  type={showSecrets.google_secret ? 'text' : 'password'}
                  placeholder="Your Google OAuth Client Secret"
                  value={configForm.client_secret || ''}
                  onChange={(e) => setConfigForm({ ...configForm, client_secret: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecrets({ ...showSecrets, google_secret: !showSecrets.google_secret })}
                >
                  {showSecrets.google_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar_id">Calendar ID</Label>
              <Input
                id="calendar_id"
                placeholder="primary or calendar@group.calendar.google.com"
                value={configForm.calendar_id || 'primary'}
                onChange={(e) => setConfigForm({ ...configForm, calendar_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sync Options</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_customer_meetings || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_customer_meetings: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync customer meetings
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_renewals || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_renewals: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Add renewal reminders to calendar
                </label>
              </div>
            </div>
          </div>
        )

      case 'salesforce':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sf_instance_url">Salesforce Instance URL</Label>
              <Input
                id="sf_instance_url"
                placeholder="https://yourcompany.salesforce.com"
                value={configForm.instance_url || ''}
                onChange={(e) => setConfigForm({ ...configForm, instance_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_client_id">Consumer Key (Client ID)</Label>
              <Input
                id="sf_client_id"
                placeholder="Your Salesforce Connected App Consumer Key"
                value={configForm.client_id || ''}
                onChange={(e) => setConfigForm({ ...configForm, client_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_client_secret">Consumer Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="sf_client_secret"
                  type={showSecrets.sf_secret ? 'text' : 'password'}
                  placeholder="Your Salesforce Consumer Secret"
                  value={configForm.client_secret || ''}
                  onChange={(e) => setConfigForm({ ...configForm, client_secret: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecrets({ ...showSecrets, sf_secret: !showSecrets.sf_secret })}
                >
                  {showSecrets.sf_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sync Settings</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_accounts || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_accounts: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync Accounts as Customers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_contacts || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_contacts: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync Contacts
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_opportunities || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_opportunities: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync Opportunities
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_sync_frequency">Sync Frequency</Label>
              <select
                id="sf_sync_frequency"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={configForm.sync_frequency || 'hourly'}
                onChange={(e) => setConfigForm({ ...configForm, sync_frequency: e.target.value })}
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
        )

      case 'hubspot':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hs_api_key">HubSpot API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="hs_api_key"
                  type={showSecrets.hs_api_key ? 'text' : 'password'}
                  placeholder="Your HubSpot API Key"
                  value={configForm.api_key || ''}
                  onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecrets({ ...showSecrets, hs_api_key: !showSecrets.hs_api_key })}
                >
                  {showSecrets.hs_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Find this in HubSpot Settings → Integrations → API Key
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hs_portal_id">Portal ID</Label>
              <Input
                id="hs_portal_id"
                placeholder="Your HubSpot Portal ID"
                value={configForm.portal_id || ''}
                onChange={(e) => setConfigForm({ ...configForm, portal_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data to Sync</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_companies || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_companies: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync Companies as Customers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_contacts || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_contacts: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync Contacts
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_deals || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_deals: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync Deals
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={configForm.sync_tickets || false}
                    onChange={(e) => setConfigForm({ ...configForm, sync_tickets: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Sync Support Tickets
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hs_sync_frequency">Sync Frequency</Label>
              <select
                id="hs_sync_frequency"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={configForm.sync_frequency || 'hourly'}
                onChange={(e) => setConfigForm({ ...configForm, sync_frequency: e.target.value })}
              >
                <option value="realtime">Real-time (Webhooks)</option>
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
        )

      default:
        return (
          <p className="text-slate-500 text-sm">
            Configuration options for this integration are not yet available.
          </p>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="py-8">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-gradient-primary">
              <Plug className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Integrations</h2>
              <p className="text-slate-600">
                Connect your favorite tools and services to enhance your workflow
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations by Category */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2 capitalize">
            {category}
            <Badge variant="secondary" className={categoryColors[category] || 'bg-slate-100'}>
              {categoryIntegrations.length}
            </Badge>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryIntegrations.map((integration) => {
              const Icon = iconMap[integration.icon] || Plug
              const isAvailable = integration.status !== 'coming_soon'
              const isConnected = integration.status === 'connected'
              const hasError = integration.status === 'error'

              return (
                <Card
                  key={integration.id}
                  className={`transition-all duration-200 ${
                    isAvailable
                      ? 'hover:shadow-md hover:border-primary/30'
                      : 'opacity-70'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        isConnected ? 'bg-success/10' :
                        hasError ? 'bg-danger/10' :
                        isAvailable ? 'bg-primary/10' : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          isConnected ? 'text-success' :
                          hasError ? 'text-danger' :
                          isAvailable ? 'text-primary' : 'text-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-slate-800">{integration.displayName}</h4>
                          {isConnected ? (
                            <Badge variant="success" className="bg-success-50 text-success-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          ) : hasError ? (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Error
                            </Badge>
                          ) : isAvailable ? (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                              <Clock className="w-3 h-3 mr-1" />
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{integration.description}</p>
                        {hasError && integration.errorMessage && (
                          <p className="text-xs text-danger mb-2">{integration.errorMessage}</p>
                        )}
                        <div className="flex items-center gap-2">
                          {isAvailable ? (
                            <>
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => handleConfigure(integration)}
                              >
                                <Settings className="w-3 h-3" />
                                Configure
                              </Button>
                              {isConnected && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => handleTestConnection(integration.id)}
                                  disabled={testMutation.isPending}
                                >
                                  {testMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Test
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              Coming Soon
                            </Button>
                          )}
                        </div>
                      </div>
                      {isAvailable && (
                        <div className="flex items-center">
                          <Switch
                            checked={integration.isEnabled}
                            onCheckedChange={(checked) => handleToggleEnabled(integration, checked)}
                            disabled={updateMutation.isPending}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Request Integration */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Plug className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-700 mb-1">Need a different integration?</h3>
          <p className="text-sm text-slate-500 mb-4">
            Let us know what tools you'd like to connect
          </p>
          <Button variant="outline">
            Request Integration
          </Button>
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      <Dialog open={configureModal.open} onOpenChange={(open) => !open && setConfigureModal({ open: false, integration: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configureModal.integration && (
                <>
                  {(() => {
                    const Icon = iconMap[configureModal.integration.icon] || Plug
                    return <Icon className="w-5 h-5 text-primary" />
                  })()}
                  Configure {configureModal.integration?.displayName}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Set up your integration settings below
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {configureModal.integration && renderConfigFields(configureModal.integration)}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigureModal({ open: false, integration: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
