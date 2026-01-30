import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ className, size = 'default', text }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative">
        <div className={cn(
          'rounded-full border-2 border-slate-200',
          sizeClasses[size]
        )} />
        <Loader2 className={cn(
          'absolute inset-0 animate-spin text-primary',
          sizeClasses[size]
        )} />
      </div>
      {text && (
        <p className="text-sm text-slate-500">{text}</p>
      )}
    </div>
  )
}

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  )
}

export function InlineLoader({ className }) {
  return (
    <Loader2 className={cn('w-4 h-4 animate-spin', className)} />
  )
}
