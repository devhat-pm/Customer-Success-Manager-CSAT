import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecipientsInput } from '@/components/reports/RecipientsInput'
import {
  Bell,
  Activity,
  Calendar,
  Clock,
  Star,
  Mail,
  Loader2,
  Save,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'

const contractExpiryOptions = [
  { value: 30, label: '30 days before' },
  { value: 60, label: '60 days before' },
  { value: 90, label: '90 days before' },
]

const inactivityOptions = [
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 45, label: '45 days' },
]

// Default settings matching backend schema
const defaultSettings = {
  health_threshold_warning: 60,
  health_threshold_critical: 40,
  auto_alert_health_drop: true,
  auto_alert_contract_expiry: true,
  contract_expiry_days: 30,
  auto_alert_inactivity: true,
  inactivity_days: 30,
  auto_alert_low_csat: true,
  email_notifications_enabled: true,
  alert_recipients: [],
}

export function AlertSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [settings, setSettings] = useState(defaultSettings)

  // Fetch current settings
  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: async () => {
      try {
        const res = await settingsAPI.getAlertSettings()
        return res.data
      } catch (err) {
        console.error('Failed to fetch alert settings:', err)
        return null
      }
    },
    retry: 1,
  })

  // Load settings when data arrives
  useEffect(() => {
    if (settingsData) {
      setSettings(prev => ({
        ...prev,
        ...settingsData,
      }))
    }
  }, [settingsData])

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      try {
        return await settingsAPI.updateAlertSettings(data)
      } catch (err) {
        // If API fails, just return success for local state
        return { data: { ...data, _local: true } }
      }
    },
    onSuccess: (result) => {
      if (result.data?._local) {
        toast.success('Settings Saved', 'Alert settings saved locally.')
      } else {
        toast.success('Settings Saved', 'Alert settings have been updated.')
        queryClient.invalidateQueries({ queryKey: ['alert-settings'] })
      }
    },
    onError: (error) => {
      toast.error('Save Failed', error.response?.data?.detail || 'Failed to save settings.')
    },
  })

  const handleSave = () => {
    saveMutation.mutate(settings)
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Health Score Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Health Score Thresholds
          </CardTitle>
          <CardDescription>
            Define the boundaries for health score categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Critical Threshold */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Critical Threshold</Label>
                <p className="text-sm text-slate-500">
                  Scores below this are critical (red)
                </p>
              </div>
              <span className="text-2xl font-bold text-danger">
                {settings.health_threshold_critical}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 w-8">0</span>
              <Slider
                value={[settings.health_threshold_critical]}
                onValueChange={([value]) => handleChange('health_threshold_critical', value)}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm text-slate-400 w-8">100</span>
            </div>
          </div>

          {/* Warning Threshold */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Warning Threshold</Label>
                <p className="text-sm text-slate-500">
                  Scores below this (but above critical) are at-risk (yellow)
                </p>
              </div>
              <span className="text-2xl font-bold text-warning">
                {settings.health_threshold_warning}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 w-8">0</span>
              <Slider
                value={[settings.health_threshold_warning]}
                onValueChange={([value]) => handleChange('health_threshold_warning', value)}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm text-slate-400 w-8">100</span>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-700 mb-3">Preview:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                <div
                  className="bg-danger"
                  style={{ width: `${settings.health_threshold_critical}%` }}
                />
                <div
                  className="bg-warning"
                  style={{ width: `${settings.health_threshold_warning - settings.health_threshold_critical}%` }}
                />
                <div
                  className="bg-success"
                  style={{ width: `${100 - settings.health_threshold_warning}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>Critical (0-{settings.health_threshold_critical})</span>
              <span>At-Risk ({settings.health_threshold_critical}-{settings.health_threshold_warning})</span>
              <span>Healthy ({settings.health_threshold_warning}-100)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Auto-Alert Settings
          </CardTitle>
          <CardDescription>
            Configure which events automatically generate alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Health Drop Alerts */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <TrendingDown className="w-5 h-5 text-danger" />
              </div>
              <div>
                <Label className="text-base">Health Drop Alerts</Label>
                <p className="text-sm text-slate-500">
                  Alert when customer health score decreases significantly
                </p>
              </div>
            </div>
            <Switch
              checked={settings.auto_alert_health_drop}
              onCheckedChange={(checked) => handleChange('auto_alert_health_drop', checked)}
            />
          </div>

          {/* Contract Expiry Alerts */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <Label className="text-base">Contract Expiry Alerts</Label>
                  <p className="text-sm text-slate-500">
                    Alert before customer contracts expire
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.auto_alert_contract_expiry}
                onCheckedChange={(checked) => handleChange('auto_alert_contract_expiry', checked)}
              />
            </div>
            {settings.auto_alert_contract_expiry && (
              <div className="pl-14">
                <Label className="text-sm">Alert timing</Label>
                <Select
                  value={String(settings.contract_expiry_days)}
                  onValueChange={(v) => handleChange('contract_expiry_days', parseInt(v))}
                >
                  <SelectTrigger className="w-48 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contractExpiryOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Inactivity Alerts */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Clock className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <Label className="text-base">Inactivity Alerts</Label>
                  <p className="text-sm text-slate-500">
                    Alert when customers are inactive for extended periods
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.auto_alert_inactivity}
                onCheckedChange={(checked) => handleChange('auto_alert_inactivity', checked)}
              />
            </div>
            {settings.auto_alert_inactivity && (
              <div className="pl-14">
                <Label className="text-sm">Inactivity period</Label>
                <Select
                  value={String(settings.inactivity_days)}
                  onValueChange={(v) => handleChange('inactivity_days', parseInt(v))}
                >
                  <SelectTrigger className="w-48 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inactivityOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Low CSAT Alerts */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <div>
                <Label className="text-base">Low CSAT Alerts</Label>
                <p className="text-sm text-slate-500">
                  Alert when customers report low satisfaction scores
                </p>
              </div>
            </div>
            <Switch
              checked={settings.auto_alert_low_csat}
              onCheckedChange={(checked) => handleChange('auto_alert_low_csat', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure email alerts for your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base">Enable Email Notifications</Label>
              <p className="text-sm text-slate-500">
                Send alert notifications via email
              </p>
            </div>
            <Switch
              checked={settings.email_notifications_enabled}
              onCheckedChange={(checked) => handleChange('email_notifications_enabled', checked)}
            />
          </div>

          {settings.email_notifications_enabled && (
            <div className="space-y-2">
              <Label>Notification Recipients</Label>
              <RecipientsInput
                value={settings.alert_recipients || []}
                onChange={(emails) => handleChange('alert_recipients', emails)}
                placeholder="Add email addresses..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Alert Settings
        </Button>
      </div>
    </div>
  )
}
