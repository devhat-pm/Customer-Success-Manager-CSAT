import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

// Page transition wrapper component
function PageTransition({ children, className }) {
  const location = useLocation()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [transitionStage, setTransitionStage] = useState('enter')

  useEffect(() => {
    if (children !== displayChildren) {
      setTransitionStage('exit')
    }
  }, [children, displayChildren])

  useEffect(() => {
    if (transitionStage === 'exit') {
      const timeout = setTimeout(() => {
        setDisplayChildren(children)
        setTransitionStage('enter')
      }, 150)
      return () => clearTimeout(timeout)
    }
  }, [transitionStage, children])

  return (
    <div
      className={cn(
        'transition-all duration-200 ease-out',
        transitionStage === 'enter' && 'opacity-100 translate-y-0',
        transitionStage === 'exit' && 'opacity-0 translate-y-2',
        className
      )}
    >
      {displayChildren}
    </div>
  )
}

// Fade in animation wrapper
function FadeIn({ children, delay = 0, duration = 300, className }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <div
      className={cn(
        'transition-all ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

// Staggered animation for lists
function StaggeredList({ children, staggerDelay = 50, initialDelay = 0, className }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const childArray = Array.isArray(children) ? children : [children]

  useEffect(() => {
    if (visibleCount < childArray.length) {
      const timeout = setTimeout(
        () => setVisibleCount(v => v + 1),
        visibleCount === 0 ? initialDelay : staggerDelay
      )
      return () => clearTimeout(timeout)
    }
  }, [visibleCount, childArray.length, staggerDelay, initialDelay])

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className={cn(
            'transition-all duration-300 ease-out',
            index < visibleCount
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

// Slide in from direction
function SlideIn({ children, direction = 'left', delay = 0, duration = 300, className }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  const transforms = {
    left: isVisible ? 'translate-x-0' : '-translate-x-8',
    right: isVisible ? 'translate-x-0' : 'translate-x-8',
    up: isVisible ? 'translate-y-0' : '-translate-y-8',
    down: isVisible ? 'translate-y-0' : 'translate-y-8',
  }

  return (
    <div
      className={cn(
        'transition-all ease-out',
        isVisible ? 'opacity-100' : 'opacity-0',
        transforms[direction],
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

// Scale in animation
function ScaleIn({ children, delay = 0, duration = 300, className }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <div
      className={cn(
        'transition-all ease-out',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

// Intersection observer based animation
function AnimateOnScroll({ children, animation = 'fade', threshold = 0.1, className }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  const animations = {
    fade: isVisible ? 'opacity-100' : 'opacity-0',
    fadeUp: isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
    fadeDown: isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8',
    fadeLeft: isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8',
    fadeRight: isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
    scale: isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500 ease-out',
        animations[animation],
        className
      )}
    >
      {children}
    </div>
  )
}

// Loading dots animation
function LoadingDots({ className }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-current rounded-full animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

// Pulse animation wrapper
function Pulse({ children, className }) {
  return (
    <div className={cn('animate-pulse', className)}>
      {children}
    </div>
  )
}

// Skeleton pulse for loading states
function SkeletonPulse({ className }) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200',
        'bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]',
        'rounded',
        className
      )}
    />
  )
}

export {
  PageTransition,
  FadeIn,
  StaggeredList,
  SlideIn,
  ScaleIn,
  AnimateOnScroll,
  LoadingDots,
  Pulse,
  SkeletonPulse,
}
