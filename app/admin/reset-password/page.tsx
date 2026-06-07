'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Phase = 'verifying' | 'ready' | 'invalid' | 'saving'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [phase, setPhase] = useState<Phase>('verifying')
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  // Step 1: verify the recovery token server-side (consumes it, sets the
  // recovery session cookie) before showing the password form.
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    if (!tokenHash) {
      setPhase('invalid')
      return
    }

    let cancelled = false
    const verify = async () => {
      try {
        const response = await fetch('/api/admin/auth/reset-password/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token_hash: tokenHash }),
        })
        const data = await response.json()
        if (cancelled) return
        if (data.success) {
          setEmail(data.data?.email ?? null)
          setPhase('ready')
        } else {
          setPhase('invalid')
        }
      } catch {
        if (!cancelled) setPhase('invalid')
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  // Step 2: set the new password.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setPhase('saving')
    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json()
      if (!data.success) {
        setError(data.error?.message || 'Could not update password. Please try again.')
        setPhase('ready')
        return
      }
      router.push('/admin/login?reset=success')
    } catch {
      setError('An error occurred. Please try again.')
      setPhase('ready')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif font-semibold text-black">
            Kwame Brathwaite
          </h1>
          <p className="text-sm text-gray-500 mt-1">Archive Admin</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {phase === 'verifying' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <span className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Verifying your reset link…</p>
            </div>
          )}

          {phase === 'invalid' && (
            <>
              <h2 className="text-lg font-medium text-black mb-3">Link expired</h2>
              <p className="text-sm text-gray-600">
                This reset link is invalid or has already been used. Reset links
                can be used once and expire after a short time.
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/forgot-password"
                  className="text-sm font-medium text-black hover:text-gray-600 underline underline-offset-4"
                >
                  Request a new link
                </Link>
              </div>
            </>
          )}

          {(phase === 'ready' || phase === 'saving') && (
            <>
              <h2 className="text-lg font-medium text-black mb-2">Set a new password</h2>
              {email && (
                <p className="text-sm text-gray-500 mb-6">
                  for <span className="font-medium text-gray-700">{email}</span>
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={phase === 'saving'}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    disabled={phase === 'saving'}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Re-enter your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={phase === 'saving'}
                  className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {phase === 'saving' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating…
                    </span>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Protected area. Authorized access only.
        </p>
      </div>
    </div>
  )
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
