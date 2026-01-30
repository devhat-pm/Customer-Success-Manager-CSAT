import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { RecipientsInput } from '@/components/reports/RecipientsInput'
import {
  FileText,
  Image,
  Upload,
  Loader2,
  Save,
  Trash2,
  Download,
  Eye,
} from 'lucide-react'

const formatOptions = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'xlsx', label: 'Excel Spreadsheet' },
  { value: 'csv', label: 'CSV File' },
]

export function ReportSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const logoInputRef = useRef(null)

  const [settings, setSettings] = useState({
    default_format: 'pdf',
    company_logo: null,
    footer_text: '',
    default_recipients: [],
  })

  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['report-settings'],
    queryFn: () => settingsAPI.getReportSettings().then(res => res.data),
  })

  // Load settings when data arrives
  useEffect(() => {
    if (settingsData) {
      setSettings(prev => ({
        ...prev,
        default_format: settingsData.default_format || 'pdf',
        footer_text: settingsData.footer_text || '',
        default_recipients: settingsData.default_recipients || [],
      }))
      if (settingsData.logo_url) {
        setLogoPreview(settingsData.logo_url)
      }
    }
  }, [settingsData])

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // First upload logo if changed
      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)  // Backend expects 'file' not 'logo'
        await settingsAPI.uploadReportLogo(formData)
      }
      // Then save other settings
      return settingsAPI.updateReportSettings(data)
    },
    onSuccess: () => {
      toast.success('Settings Saved', 'Report settings have been updated.')
      queryClient.invalidateQueries({ queryKey: ['report-settings'] })
      setLogoFile(null)
    },
    onError: (error) => {
      toast.error('Save Failed', error.response?.data?.detail || 'Failed to save settings.')
    },
  })

  const deleteLogoMutation = useMutation({
    mutationFn: () => settingsAPI.deleteReportLogo(),
    onSuccess: () => {
      toast.success('Logo Removed', 'Company logo has been removed from reports.')
      setLogoPreview(null)
      queryClient.invalidateQueries({ queryKey: ['report-settings'] })
    },
    onError: (error) => {
      toast.error('Delete Failed', error.response?.data?.detail || 'Failed to remove logo.')
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      default_format: settings.default_format,
      footer_text: settings.footer_text,
      default_recipients: settings.default_recipients,
    })
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File Too Large', 'Please select an image under 2MB.')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Invalid File', 'Please select an image file.')
        return
      }

      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    if (settingsData?.logo_url) {
      deleteLogoMutation.mutate()
    } else {
      setLogoPreview(null)
      setLogoFile(null)
    }
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
      {/* Default Report Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Format
          </CardTitle>
          <CardDescription>
            Set the default format for generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label>Default Export Format</Label>
            <Select
              value={settings.default_format}
              onValueChange={(v) => handleChange('default_format', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      {format.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              This will be the default format when generating new reports.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Company Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Company Branding
          </CardTitle>
          <CardDescription>
            Add your company logo to appear in report headers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative group">
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="w-32 h-20 object-contain border border-slate-200 rounded-lg bg-white p-2"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                        onClick={() => window.open(logoPreview, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-32 h-20 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs">Upload Logo</span>
                  </div>
                )}
              </div>

              {/* Upload Instructions */}
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-3">
                  Upload your company logo to display in the header of generated reports.
                  Recommended size: 300x100 pixels. Max file size: 2MB.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  {logoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Footer
          </CardTitle>
          <CardDescription>
            Add custom text to appear at the bottom of reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-2xl">
            <Label htmlFor="footer_text">Footer Text</Label>
            <Textarea
              id="footer_text"
              value={settings.footer_text}
              onChange={(e) => handleChange('footer_text', e.target.value)}
              placeholder="e.g., Confidential - For internal use only. Generated by Customer Success Platform."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              This text will appear at the bottom of every generated report. Max 500 characters.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Default Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Default Recipients
          </CardTitle>
          <CardDescription>
            Set default email recipients for report delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-2xl">
            <Label>Email Recipients</Label>
            <RecipientsInput
              value={settings.default_recipients}
              onChange={(emails) => handleChange('default_recipients', emails)}
              placeholder="Add email addresses..."
            />
            <p className="text-xs text-slate-500">
              These recipients will be pre-filled when scheduling or sending reports.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Report Preview
          </CardTitle>
          <CardDescription>
            Preview how your branding will appear in reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            {/* Header Preview */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="h-8 object-contain" />
              ) : (
                <div className="text-sm text-slate-400">Company Logo</div>
              )}
              <div className="text-right text-sm text-slate-500">
                <div>Customer Success Report</div>
                <div>Generated: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Content Placeholder */}
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-20 bg-slate-50 rounded mt-4" />
            </div>

            {/* Footer Preview */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                {settings.footer_text || 'Report footer text will appear here'}
              </p>
            </div>
          </div>
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
          Save Report Settings
        </Button>
      </div>
    </div>
  )
}
