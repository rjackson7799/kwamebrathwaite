'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminUser } from './AuthGuard'

interface AdminHeaderProps {
  title?: string
}

export function AdminHeader({ title = 'Dashboard' }: AdminHeaderProps) {
  const { user } = useAdminUser()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      setLoggingOut(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.email || 'Loading...'}
          </span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  )
}
