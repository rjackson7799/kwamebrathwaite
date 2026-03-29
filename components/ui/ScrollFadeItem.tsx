'use client'

import { useRef, useEffect, useState } from 'react'

export function ScrollFadeItem({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const staggerDelay = Math.min(index % 4, 3) * 80

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${staggerDelay}ms, transform 0.5s ease ${staggerDelay}ms`,
      }}
    >
      {children}
    </div>
  )
}
