'use client'

import React, { useState, useEffect } from 'react'

interface SectionMetadata {
  show_timeline?: boolean
  show_movement?: boolean
}

interface PageSetting {
  id: string
  page_slug: string
  show_title: boolean
  metadata: SectionMetadata | null
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
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch')
      }
      setSettings(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page settings')
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

  const toggleMetadataFlag = async (
    pageSlug: string,
    currentMetadata: SectionMetadata | null,
    flag: keyof SectionMetadata
  ) => {
    setSaving(`${pageSlug}-${flag}`)
    const newMetadata: SectionMetadata = {
      show_timeline: currentMetadata?.show_timeline ?? false,
      show_movement: currentMetadata?.show_movement ?? false,
      [flag]: !(currentMetadata?.[flag] ?? false),
    }
    try {
      const res = await fetch('/api/admin/page-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_slug: pageSlug, metadata: newMetadata }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setSettings(prev =>
        prev.map(s =>
          s.page_slug === pageSlug ? { ...s, metadata: newMetadata } : s
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
              <React.Fragment key={setting.id}>
                <tr className="hover:bg-gray-50 transition-colors">
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
                {setting.page_slug === 'about' && (
                  <tr className="bg-gray-50/50 border-t border-gray-100">
                    <td className="px-4 py-3 pl-8">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Section Visibility
                      </span>
                    </td>
                    <td className="px-4 py-3" colSpan={2}>
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMetadataFlag(setting.page_slug, setting.metadata, 'show_timeline')}
                            disabled={saving === `${setting.page_slug}-show_timeline`}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full
                              transition-colors duration-200
                              ${setting.metadata?.show_timeline ? 'bg-black' : 'bg-gray-300'}
                              ${saving === `${setting.page_slug}-show_timeline` ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                            `}
                            role="switch"
                            aria-checked={setting.metadata?.show_timeline ?? false}
                            aria-label="Toggle Timeline section"
                          >
                            <span
                              className={`
                                inline-block h-4 w-4 rounded-full bg-white
                                transition-transform duration-200
                                ${setting.metadata?.show_timeline ? 'translate-x-6' : 'translate-x-1'}
                              `}
                            />
                          </button>
                          <span className="text-xs text-gray-600">Timeline</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMetadataFlag(setting.page_slug, setting.metadata, 'show_movement')}
                            disabled={saving === `${setting.page_slug}-show_movement`}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full
                              transition-colors duration-200
                              ${setting.metadata?.show_movement ? 'bg-black' : 'bg-gray-300'}
                              ${saving === `${setting.page_slug}-show_movement` ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                            `}
                            role="switch"
                            aria-checked={setting.metadata?.show_movement ?? false}
                            aria-label="Toggle Movement section"
                          >
                            <span
                              className={`
                                inline-block h-4 w-4 rounded-full bg-white
                                transition-transform duration-200
                                ${setting.metadata?.show_movement ? 'translate-x-6' : 'translate-x-1'}
                              `}
                            />
                          </button>
                          <span className="text-xs text-gray-600">Movement</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
