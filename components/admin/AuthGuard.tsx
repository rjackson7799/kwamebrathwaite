'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import type { User } from '@supabase/supabase-js'

interface AuthGuardProps {
  children: React.ReactNode
}

const PUBLIC_ADMIN_PATHS = [
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
]

export function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    // Check initial session
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)

      if (!user && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
        router.push('/admin/login')
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)

        if (event === 'SIGNED_OUT' && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
          router.push('/admin/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Allow public auth pages without auth - no sidebar
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  // Require auth for all other admin pages
  if (!user) {
    return null // Will redirect in useEffect
  }

  // Authenticated - show sidebar and content
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="pl-64">
        {children}
      </main>
    </div>
  )
}

// Hook to get current user in admin components
export function useAdminUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
