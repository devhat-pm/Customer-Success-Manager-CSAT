import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Plus,
  MoreVertical,
  Edit,
  UserX,
  UserCheck,
  Mail,
  Loader2,
  Users,
  Shield,
  User,
} from 'lucide-react'

const roleOptions = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Can manage customers and team' },
  { value: 'user', label: 'User', description: 'Standard access' },
]

export function TeamMembersSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [userToDeactivate, setUserToDeactivate] = useState(null)

  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'user',
  })

  // Fetch team members
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => usersAPI.getAll().then(res => res.data),
  })

  const users = usersData?.users || []

  const inviteMutation = useMutation({
    mutationFn: (data) => usersAPI.invite(data),
    onSuccess: () => {
      toast.success('Invitation Sent', 'An invitation email has been sent to the user.')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setInviteModalOpen(false)
      setInviteForm({ email: '', full_name: '', role: 'user' })
    },
    onError: (error) => {
      toast.error('Invitation Failed', error.response?.data?.detail || 'Failed to send invitation.')
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      toast.success('User Updated', 'User details have been updated.')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setEditModalOpen(false)
      setEditingUser(null)
    },
    onError: (error) => {
      toast.error('Update Failed', error.response?.data?.detail || 'Failed to update user.')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => usersAPI.deactivate(id),
    onSuccess: () => {
      toast.success('User Deactivated', 'The user has been deactivated.')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setDeactivateConfirmOpen(false)
      setUserToDeactivate(null)
    },
    onError: (error) => {
      toast.error('Deactivation Failed', error.response?.data?.detail || 'Failed to deactivate user.')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: (id) => usersAPI.reactivate(id),
    onSuccess: () => {
      toast.success('User Reactivated', 'The user has been reactivated.')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
    onError: (error) => {
      toast.error('Reactivation Failed', error.response?.data?.detail || 'Failed to reactivate user.')
    },
  })

  const handleInvite = (e) => {
    e.preventDefault()
    inviteMutation.mutate(inviteForm)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setEditModalOpen(true)
  }

  const handleUpdateUser = (e) => {
    e.preventDefault()
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        full_name: editingUser.full_name,
        role: editingUser.role,
      },
    })
  }

  const handleDeactivate = (user) => {
    setUserToDeactivate(user)
    setDeactivateConfirmOpen(true)
  }

  const confirmDeactivate = () => {
    if (userToDeactivate) {
      deactivateMutation.mutate(userToDeactivate.id)
    }
  }

  const formatLastLogin = (dateStr) => {
    if (!dateStr) return 'Never'
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'danger'
      case 'manager': return 'warning'
      default: return 'secondary'
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>Manage your team's access and permissions</CardDescription>
            </div>
            <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              <p className="text-sm text-slate-500 mt-2">Loading team members...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No team members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-medium">
                            {getInitials(user.full_name)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{user.full_name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'success' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatLastLogin(user.last_login)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.is_active ? (
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(user)}
                              className="text-danger"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => reactivateMutation.mutate(user.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite_email">Email Address</Label>
                <Input
                  id="invite_email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite_name">Full Name</Label>
                <Input
                  id="invite_name"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) => setInviteForm(prev => ({ ...prev, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <p className="font-medium">{role.label}</p>
                          <p className="text-xs text-slate-500">{role.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending} className="gap-2">
                {inviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Full Name</Label>
                  <Input
                    id="edit_name"
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_email">Email (Read-only)</Label>
                  <Input
                    id="edit_email"
                    value={editingUser.email}
                    disabled
                    className="bg-slate-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(v) => setEditingUser(prev => ({ ...prev, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending} className="gap-2">
                  {updateUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {userToDeactivate?.full_name}? They will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-danger hover:bg-danger/90"
            >
              {deactivateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
