import { createContext, useContext, useState, useCallback } from 'react'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ title, description, variant = 'default', duration = 5000 }) => {
    const id = Date.now()
    // Ensure description is a string, not an object
    let safeDescription = description
    if (typeof description === 'object' && description !== null) {
      safeDescription = description.message || description.msg || description.detail || JSON.stringify(description)
    }
    setToasts(prev => [...prev, { id, title, description: safeDescription, variant }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (title, description) => addToast({ title, description, variant: 'success' }),
    error: (title, description) => addToast({ title, description, variant: 'destructive' }),
    warning: (title, description) => addToast({ title, description, variant: 'warning' }),
    info: (title, description) => addToast({ title, description, variant: 'default' }),
  }

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      <RadixToastProvider>
        {children}
        {toasts.map(({ id, title, description, variant }) => (
          <Toast key={id} variant={variant} onOpenChange={(open) => !open && removeToast(id)}>
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastContext
