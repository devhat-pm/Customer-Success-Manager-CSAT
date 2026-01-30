import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Shield,
  Smartphone,
  Key,
  Trash2,
  Loader2,
  Clock,
  Globe,
  Eye,
  EyeOff,
  Lock,
  Info,
  CheckCircle,
  XCircle,
  Monitor,
  LogOut,
} from 'lucide-react'
import { settingsAPI, accountAPI } from '@/services/api'
import { formatDistanceToNow } from 'date-fns'

export function AccountSettings() {
  const { user, logout, changePassword } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState(null)
  const [disableTwoFactorOpen, setDisableTwoFactorOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  // Fetch notification settings for session timeout
  const { data: notificationSettings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const response = await settingsAPI.getNotificationSettings()
      return response.data
    },
  })

  // Fetch 2FA status
  const { data: twoFactorStatus, isLoading: twoFactorLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      try {
        const response = await accountAPI.get2FAStatus()
        return response.data
      } catch (err) {
        return { enabled: false, has_secret: false }
      }
    },
  })

  // Fetch active sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      try {
        const response = await accountAPI.getSessions()
        return response.data
      } catch (err) {
        return []
      }
    },
  })

  const [sessionTimeout, setSessionTimeout] = useState('30')

  useEffect(() => {
    if (notificationSettings?.session_timeout) {
      setSessionTimeout(notificationSettings.session_timeout)
    }
  }, [notificationSettings])

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await settingsAPI.updateNotificationSettings(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-settings'])
      toast.success('Settings Updated', 'Session timeout preference saved.')
    },
    onError: (error) => {
      toast.error('Update Failed', error.response?.data?.detail || 'Failed to save settings.')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      if (changePassword) {
        return await changePassword(data.current_password, data.new_password)
      }
      throw new Error('Change password not available')
    },
    onSuccess: () => {
      toast.success('Password Changed', 'Your password has been changed successfully.')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    },
    onError: (error) => {
      toast.error('Password Change Failed', error.message || 'Failed to change password.')
    },
  })

  // 2FA Mutations
  const setup2FAMutation = useMutation({
    mutationFn: () => accountAPI.setup2FA(),
    onSuccess: (response) => {
      setTwoFactorSecret(response.data)
      setTwoFactorSetupOpen(true)
    },
    onError: (error) => {
      toast.error('Setup Failed', error.response?.data?.detail || 'Failed to setup 2FA.')
    },
  })

  const enable2FAMutation = useMutation({
    mutationFn: (code) => accountAPI.enable2FA(code),
    onSuccess: () => {
      toast.success('2FA Enabled', 'Two-factor authentication is now active.')
      setTwoFactorSetupOpen(false)
      setTwoFactorCode('')
      setTwoFactorSecret(null)
      queryClient.invalidateQueries(['2fa-status'])
    },
    onError: (error) => {
      toast.error('Verification Failed', error.response?.data?.detail || 'Invalid code. Please try again.')
    },
  })

  const disable2FAMutation = useMutation({
    mutationFn: (password) => accountAPI.disable2FA(password),
    onSuccess: () => {
      toast.success('2FA Disabled', 'Two-factor authentication has been disabled.')
      setDisableTwoFactorOpen(false)
      setDisablePassword('')
      queryClient.invalidateQueries(['2fa-status'])
    },
    onError: (error) => {
      toast.error('Failed', error.response?.data?.detail || 'Invalid password.')
    },
  })

  // Session mutations
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId) => accountAPI.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('Session Revoked', 'The session has been terminated.')
      queryClient.invalidateQueries(['active-sessions'])
    },
    onError: (error) => {
      toast.error('Failed', error.response?.data?.detail || 'Failed to revoke session.')
    },
  })

  const revokeAllSessionsMutation = useMutation({
    mutationFn: () => accountAPI.revokeAllSessions(),
    onSuccess: () => {
      toast.success('Sessions Revoked', 'All other sessions have been terminated.')
      queryClient.invalidateQueries(['active-sessions'])
    },
    onError: (error) => {
      toast.error('Failed', error.response?.data?.detail || 'Failed to revoke sessions.')
    },
  })

  // Account deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (password) => accountAPI.deleteAccount(password),
    onSuccess: () => {
      toast.success('Account Deleted', 'Your account has been permanently deleted.')
      setDeleteDialogOpen(false)
      logout()
    },
    onError: (error) => {
      toast.error('Deletion Failed', error.response?.data?.detail || 'Failed to delete account.')
    },
  })

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleChangePassword = (e) => {
    e.preventDefault()

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Password Mismatch', 'New passwords do not match.')
      return
    }

    if (passwordData.new_password.length < 8) {
      toast.error('Weak Password', 'Password must be at least 8 characters.')
      return
    }

    changePasswordMutation.mutate({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password,
    })
  }

  const handleSessionTimeoutChange = (value) => {
    setSessionTimeout(value)
    updateNotificationsMutation.mutate({ session_timeout: value })
  }

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast.error('Password Required', 'Please enter your password to confirm.')
      return
    }
    deleteAccountMutation.mutate(deletePassword)
  }

  return (
    <div className="space-y-6">
      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change Password */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    name="current_password"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    className="pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      name="new_password"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      className="pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle password visibility"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      className="pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle password visibility"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={changePasswordMutation.isPending || !passwordData.current_password || !passwordData.new_password}
                className="gap-2"
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Change Password
              </Button>
            </form>
          </div>

          <div className="border-t pt-6">
            {/* Two-Factor Auth */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Smartphone className={`w-5 h-5 ${twoFactorStatus?.enabled ? 'text-success' : 'text-slate-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Two-Factor Authentication</p>
                    {twoFactorStatus?.enabled && (
                      <Badge variant="success" className="bg-success-50 text-success-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                </div>
              </div>
              {twoFactorLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : twoFactorStatus?.enabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisableTwoFactorOpen(true)}
                  className="text-danger hover:text-danger"
                >
                  Disable
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setup2FAMutation.mutate()}
                  disabled={setup2FAMutation.isPending}
                >
                  {setup2FAMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Enable 2FA'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Session Settings
          </CardTitle>
          <CardDescription>Configure your session preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <Globe className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-slate-500">Auto-logout after inactivity</p>
              </div>
            </div>
            <select
              value={sessionTimeout}
              onChange={(e) => handleSessionTimeoutChange(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Session timeout duration"
              disabled={updateNotificationsMutation.isPending}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="never">Never</option>
            </select>
          </div>

          {/* Active Sessions */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active Sessions</p>
                <p className="text-sm text-slate-500">Manage your active sessions across devices</p>
              </div>
              {(sessions?.length || 0) > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeAllSessionsMutation.mutate()}
                  disabled={revokeAllSessionsMutation.isPending}
                >
                  {revokeAllSessionsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  Revoke All Others
                </Button>
              )}
            </div>

            {sessionsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : sessions?.length > 0 ? (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium">{session.device_info}</p>
                        <p className="text-xs text-slate-500">
                          {session.ip_address} • Last active {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {session.is_current ? (
                      <Badge variant="secondary">Current</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                        disabled={revokeSessionMutation.isPending}
                        className="text-danger hover:text-danger"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No active sessions found</p>
            )}
          </div>

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Session timeout determines how long you stay logged in without activity.
              For security, we recommend using shorter timeouts on shared devices.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-danger">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-danger-50 rounded-lg border border-danger/20">
            <div>
              <p className="font-medium text-danger">Delete Account</p>
              <p className="text-sm text-slate-600">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={twoFactorSetupOpen} onOpenChange={setTwoFactorSetupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {twoFactorSecret && (
              <>
                <div className="flex justify-center">
                  <div className="p-4 bg-white border rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorSecret.provisioning_uri)}`}
                      alt="2FA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Or enter this code manually:</Label>
                  <code className="block p-2 bg-slate-100 rounded text-sm text-center font-mono">
                    {twoFactorSecret.secret}
                  </code>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="2fa-code">Enter the 6-digit code from your app:</Label>
                  <Input
                    id="2fa-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTwoFactorSetupOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => enable2FAMutation.mutate(twoFactorCode)}
              disabled={twoFactorCode.length !== 6 || enable2FAMutation.isPending}
            >
              {enable2FAMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disableTwoFactorOpen} onOpenChange={setDisableTwoFactorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to confirm disabling 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTwoFactorOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disable2FAMutation.mutate(disablePassword)}
              disabled={!disablePassword || disable2FAMutation.isPending}
            >
              {disable2FAMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-danger">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="delete-password">Enter your password to confirm:</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!deletePassword || deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
