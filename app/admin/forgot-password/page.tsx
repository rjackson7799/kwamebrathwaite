'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })
      const data = await response.json()

      if (!data.success) {
        setError(data.error?.message || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // Generic success regardless of whether the email is an admin.
      setSubmitted(true)
      setLoading(false)
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
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
          {submitted ? (
            <>
              <h2 className="text-lg font-medium text-black mb-3">Check your email</h2>
              <p className="text-sm text-gray-600">
                If that email belongs to an admin, a password reset link is on
                its way. The link can be used once and expires after a short time.
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/login"
                  className="text-sm font-medium text-black hover:text-gray-600 underline underline-offset-4"
                >
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-medium text-black mb-2">Reset password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your admin email and we&rsquo;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Honeypot — hidden from users, bots fill it in */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="admin@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/admin/login"
                  className="text-sm text-gray-500 hover:text-black"
                >
                  Back to sign in
                </Link>
              </div>
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
