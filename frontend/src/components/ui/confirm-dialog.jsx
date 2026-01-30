import { useState, createContext, useContext, useCallback } from 'react'
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
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Trash2, LogOut, Save, Info } from 'lucide-react'

// Preset configurations
const presets = {
  delete: {
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmLabel: 'Delete',
    variant: 'destructive',
    icon: Trash2,
  },
  unsavedChanges: {
    title: 'Unsaved Changes',
    description: 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
    confirmLabel: 'Leave Without Saving',
    cancelLabel: 'Stay',
    variant: 'destructive',
    icon: AlertTriangle,
  },
  logout: {
    title: 'Logout',
    description: 'Are you sure you want to logout? You will need to sign in again to access your account.',
    confirmLabel: 'Logout',
    variant: 'default',
    icon: LogOut,
  },
  save: {
    title: 'Save Changes',
    description: 'Are you sure you want to save these changes?',
    confirmLabel: 'Save',
    variant: 'default',
    icon: Save,
  },
  confirm: {
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed with this action?',
    confirmLabel: 'Confirm',
    variant: 'default',
    icon: Info,
  },
}

// Context for global confirm dialogs
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    config: null,
    resolve: null,
  })

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      const preset = options.preset ? presets[options.preset] : {}
      setState({
        isOpen: true,
        config: { ...preset, ...options },
        resolve,
      })
    })
  }, [])

  const handleConfirm = () => {
    setState(prev => ({ ...prev, isOpen: false }))
    state.resolve?.(true)
  }

  const handleCancel = () => {
    setState(prev => ({ ...prev, isOpen: false }))
    state.resolve?.(false)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.config && (
        <ConfirmDialog
          open={state.isOpen}
          onOpenChange={(open) => !open && handleCancel()}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          {...state.config}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

// Standalone confirm dialog component
function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon: Icon,
  loading = false,
  children,
}) {
  const isDestructive = variant === 'destructive'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {Icon && (
              <div className={`p-2 rounded-full ${
                isDestructive ? 'bg-danger-50' : 'bg-primary-50'
              }`}>
                <Icon className={`w-5 h-5 ${
                  isDestructive ? 'text-danger' : 'text-primary'
                }`} />
              </div>
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={isDestructive ? 'bg-danger hover:bg-danger/90' : ''}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Delete confirmation dialog
function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName = 'this item',
  loading = false,
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Item"
      description={`Are you sure you want to delete ${itemName}? This action cannot be undone.`}
      confirmLabel="Delete"
      variant="destructive"
      icon={Trash2}
      loading={loading}
    />
  )
}

// Unsaved changes dialog
function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title="Unsaved Changes"
      description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      confirmLabel="Leave Without Saving"
      cancelLabel="Stay"
      variant="destructive"
      icon={AlertTriangle}
    />
  )
}

// Logout confirmation dialog
function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Logout"
      description="Are you sure you want to logout? You will need to sign in again to access your account."
      confirmLabel="Logout"
      icon={LogOut}
      loading={loading}
    />
  )
}

export {
  ConfirmDialog,
  DeleteConfirmDialog,
  UnsavedChangesDialog,
  LogoutConfirmDialog,
}
