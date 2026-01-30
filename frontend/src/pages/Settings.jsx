import { Routes, Route, Navigate } from 'react-router-dom'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { AccountSettings } from '@/components/settings/AccountSettings'
import { TeamMembersSettings } from '@/components/settings/TeamMembersSettings'
import { AlertSettings } from '@/components/settings/AlertSettings'
import { ReportSettings } from '@/components/settings/ReportSettings'
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings'
import { SystemHealthSettings } from '@/components/settings/SystemHealthSettings'
import { useAuth } from '@/contexts/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.is_admin

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Sidebar */}
        <SettingsSidebar />

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          <Routes>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="account" element={<AccountSettings />} />
            {isAdmin && <Route path="team" element={<TeamMembersSettings />} />}
            <Route path="alerts" element={<AlertSettings />} />
            <Route path="reports" element={<ReportSettings />} />
            {isAdmin && <Route path="integrations" element={<IntegrationsSettings />} />}
            {isAdmin && <Route path="system" element={<SystemHealthSettings />} />}
            <Route path="*" element={<Navigate to="profile" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
