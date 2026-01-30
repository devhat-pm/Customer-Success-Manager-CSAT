import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Zap,
  Users,
  Ticket,
  FileText,
} from 'lucide-react'
import { settingsAPI } from '@/services/api'
import { InlineLoader } from '@/components/layout/LoadingSpinner'

const statusColors = {
  healthy: 'text-success',
  warning: 'text-warning',
  critical: 'text-danger',
}

const statusBgColors = {
  healthy: 'bg-success-50',
  warning: 'bg-warning-50',
  critical: 'bg-danger-50',
}

const statusIcons = {
  healthy: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
}

export function SystemHealthSettings() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await settingsAPI.getSystemHealth()
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <InlineLoader className="w-8 h-8" />
        <span className="ml-3 text-slate-500">Loading system health...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-danger/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-danger">
            <XCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">Failed to load system health</p>
              <p className="text-sm text-slate-500">{error.message}</p>
            </div>
          </div>
          <Button onClick={handleRefresh} className="mt-4" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const StatusIcon = statusIcons[health?.status || 'healthy']

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={`border-2 ${
        health?.status === 'healthy' ? 'border-success/30' :
        health?.status === 'warning' ? 'border-warning/30' : 'border-danger/30'
      }`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${statusBgColors[health?.status || 'healthy']}`}>
                <StatusIcon className={`w-8 h-8 ${statusColors[health?.status || 'healthy']}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-800">
                    System Status
                  </h2>
                  <Badge variant={health?.status === 'healthy' ? 'success' : health?.status === 'warning' ? 'warning' : 'destructive'}>
                    {health?.status ? health.status.charAt(0).toUpperCase() + health.status.slice(1) : 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {health?.uptime || 'N/A'} uptime
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Updated {health?.lastUpdated ? new Date(health.lastUpdated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Service Status
          </CardTitle>
          <CardDescription>
            Real-time status of all system services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(health?.services || []).map((service) => {
              const ServiceStatusIcon = statusIcons[service.status] || CheckCircle2
              return (
                <div
                  key={service.name}
                  className={`p-4 rounded-lg ${statusBgColors[service.status] || 'bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ServiceStatusIcon className={`w-5 h-5 ${statusColors[service.status] || 'text-slate-500'}`} />
                      <div>
                        <p className="font-medium text-slate-800">{service.name}</p>
                        <p className="text-sm text-slate-500">{service.uptime} uptime</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{service.latency}</Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resource Usage
          </CardTitle>
          <CardDescription>
            Current system resource utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">CPU Usage</span>
                </div>
                <span className={`text-sm ${health?.metrics?.cpu > 80 ? 'text-danger' : health?.metrics?.cpu > 60 ? 'text-warning' : 'text-slate-500'}`}>
                  {health?.metrics?.cpu || 0}%
                </span>
              </div>
              <Progress value={health?.metrics?.cpu || 0} className="h-2" />
            </div>

            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStick className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">Memory Usage</span>
                </div>
                <span className={`text-sm ${health?.metrics?.memory > 80 ? 'text-danger' : health?.metrics?.memory > 60 ? 'text-warning' : 'text-slate-500'}`}>
                  {health?.metrics?.memory || 0}%
                </span>
              </div>
              <Progress value={health?.metrics?.memory || 0} className="h-2" />
            </div>

            {/* Storage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">Storage</span>
                </div>
                <span className={`text-sm ${health?.metrics?.storage > 80 ? 'text-danger' : health?.metrics?.storage > 60 ? 'text-warning' : 'text-slate-500'}`}>
                  {health?.metrics?.storage || 0}%
                </span>
              </div>
              <Progress value={health?.metrics?.storage || 0} className="h-2" />
            </div>

            {/* Bandwidth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-500" />
                  <span className="font-medium">Bandwidth</span>
                </div>
                <span className="text-sm text-slate-500">{health?.metrics?.bandwidth || 0}%</span>
              </div>
              <Progress value={health?.metrics?.bandwidth || 0} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent Incidents & Maintenance
          </CardTitle>
          <CardDescription>
            Past and scheduled system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!health?.recentIncidents || health.recentIncidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-success/30 mx-auto mb-3" />
              <p className="text-slate-500">No recent incidents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {health.recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {incident.status === 'resolved' ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : incident.status === 'scheduled' ? (
                      <Clock className="w-5 h-5 text-primary" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800">{incident.title}</p>
                      <p className="text-sm text-slate-500">
                        {incident.date} - Duration: {incident.duration}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    incident.status === 'resolved' ? 'success' :
                    incident.status === 'scheduled' ? 'secondary' : 'warning'
                  }>
                    {incident.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Information
          </CardTitle>
          <CardDescription>
            Database statistics and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{health?.database?.size || 'N/A'}</p>
              <p className="text-sm text-slate-500">Database Size</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{health?.database?.totalRecords?.toLocaleString() || 0}</p>
              <p className="text-sm text-slate-500">Total Records</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{health?.database?.tableCount || 0}</p>
              <p className="text-sm text-slate-500">Tables</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className={`text-2xl font-bold ${health?.database?.connectionStatus === 'Active' ? 'text-success' : 'text-warning'}`}>
                {health?.database?.connectionStatus || 'Unknown'}
              </p>
              <p className="text-sm text-slate-500">Connection Pool</p>
            </div>
          </div>

          {/* Record breakdown */}
          {health?.database && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">{health.database.customers || 0}</p>
                  <p className="text-xs text-slate-500">Customers</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">{health.database.users || 0}</p>
                  <p className="text-xs text-slate-500">Users</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Ticket className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">{health.database.tickets || 0}</p>
                  <p className="text-xs text-slate-500">Tickets</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">{health.database.surveys || 0}</p>
                  <p className="text-xs text-slate-500">Surveys</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
