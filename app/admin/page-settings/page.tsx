'use client'

import { useState, useEffect } from 'react'

interface PageSetting {
  id: string
  page_slug: string
  show_title: boolean
  updated_at: string
}

const PAGE_LABELS: Record<string, string> = {
  works: 'Works (Gallery)',
  about: 'About',
  press: 'Press',
  exhibitions: 'Exhibitions',
  contact: 'Contact',
  archive: 'The Archive',
  shop: 'Shop',
  licensing: 'Licensing',
}

export default function PageSettingsPage() {
  const [settings, setSettings] = useState<PageSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/page-settings')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch {
      setError('Failed to load page settings')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleShowTitle = async (pageSlug: string, currentValue: boolean) => {
    setSaving(pageSlug)
    try {
      const res = await fetch('/api/admin/page-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_slug: pageSlug, show_title: !currentValue }),
      })

      if (!res.ok) throw new Error('Failed to update')

      setSettings(prev =>
        prev.map(s =>
          s.page_slug === pageSlug ? { ...s, show_title: !currentValue } : s
        )
      )
    } catch {
      setError('Failed to update setting')
    } finally {
      setSaving(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-6">Page Settings</h1>
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2">Page Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Control display settings for each public page. Toggle the page title (H1 heading) on or off.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Page
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Show Title
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {settings.map((setting) => (
              <tr key={setting.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  <span className="text-sm font-medium text-gray-900">
                    {PAGE_LABELS[setting.page_slug] || setting.page_slug}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    /{setting.page_slug}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => toggleShowTitle(setting.page_slug, setting.show_title)}
                    disabled={saving === setting.page_slug}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full
                      transition-colors duration-200
                      ${setting.show_title ? 'bg-black' : 'bg-gray-300'}
                      ${saving === setting.page_slug ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                    `}
                    role="switch"
                    aria-checked={setting.show_title}
                    aria-label={`Toggle title for ${PAGE_LABELS[setting.page_slug] || setting.page_slug}`}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 rounded-full bg-white
                        transition-transform duration-200
                        ${setting.show_title ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </td>
                <td className="px-4 py-4 text-xs text-gray-400">
                  {new Date(setting.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
