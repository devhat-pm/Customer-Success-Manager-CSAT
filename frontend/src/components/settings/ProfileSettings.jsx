import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User,
  Mail,
  Phone,
  Camera,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react'

export function ProfileSettings() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersAPI.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile Updated', 'Your profile has been updated successfully.')
      refreshUser?.()
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error) => {
      toast.error('Update Failed', error.response?.data?.detail || 'Failed to update profile.')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data) => usersAPI.changePassword(data),
    onSuccess: () => {
      toast.success('Password Changed', 'Your password has been changed successfully.')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    },
    onError: (error) => {
      toast.error('Password Change Failed', error.response?.data?.detail || 'Failed to change password.')
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return usersAPI.uploadAvatar(formData)
    },
    onSuccess: () => {
      toast.success('Avatar Updated', 'Your avatar has been updated successfully.')
      refreshUser?.()
      setAvatarFile(null)
    },
    onError: () => {
      toast.error('Upload Failed', 'Failed to upload avatar.')
    },
  })

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File Too Large', 'Please select an image under 5MB.')
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const handleSaveAvatar = () => {
    if (avatarFile) {
      uploadAvatarMutation.mutate(avatarFile)
    }
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

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarPreview || user?.avatar_url ? (
                <img
                  src={avatarPreview || user?.avatar_url}
                  alt={user?.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {getInitials(user?.full_name)}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-4 h-4 text-slate-600" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-600 mb-2">
                Upload a new profile photo. JPG, PNG or GIF. Max 5MB.
              </p>
              {avatarFile && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveAvatar}
                    disabled={uploadAvatarMutation.isPending}
                    size="sm"
                  >
                    {uploadAvatarMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Save Photo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarFile(null)
                      setAvatarPreview(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleProfileChange}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="pl-9 bg-slate-50"
                  />
                </div>
                <p className="text-xs text-slate-400">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleProfileChange}
                    placeholder="+1 (555) 000-0000"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2">
                {updateProfileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Ensure your account is using a secure password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
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
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                variant="secondary"
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
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
