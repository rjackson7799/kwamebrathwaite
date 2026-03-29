'use client'

import React, { useState, useEffect } from 'react'

interface SectionMetadata {
  show_timeline?: boolean
  show_movement?: boolean
}

interface GlobalMetadata {
  content_font_scale?: 'small' | 'default' | 'large'
}

interface PageSetting {
  id: string
  page_slug: string
  show_title: boolean
  metadata: SectionMetadata | GlobalMetadata | null
  updated_at: string
}

type FontScalePreset = 'small' | 'default' | 'large'

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

const FONT_SCALE_OPTIONS: { value: FontScalePreset; label: string; description: string }[] = [
  { value: 'small', label: 'Small', description: '87.5%' },
  { value: 'default', label: 'Default', description: '100%' },
  { value: 'large', label: 'Large', description: '112.5%' },
]

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

  // Separate global settings from per-page settings
  const globalSettings = settings.find(s => s.page_slug === '_global')
  const pageSettings = settings.filter(s => s.page_slug !== '_global')

  const currentFontScale: FontScalePreset =
    (globalSettings?.metadata as GlobalMetadata)?.content_font_scale || 'default'

  const updateFontScale = async (value: FontScalePreset) => {
    setSaving('_global-font-scale')
    try {
      const res = await fetch('/api/admin/page-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_slug: '_global',
          metadata: { content_font_scale: value },
        }),
      })

      if (!res.ok) throw new Error('Failed to update')

      setSettings(prev =>
        prev.map(s =>
          s.page_slug === '_global'
            ? { ...s, metadata: { content_font_scale: value } }
            : s
        )
      )
    } catch {
      setError('Failed to update font scale')
    } finally {
      setSaving(null)
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

      {/* Global Content Settings */}
      <div className="mb-8 border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-1">
          Content Font Size
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Adjust the body text size across all public pages (all languages).
        </p>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {FONT_SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFontScale(option.value)}
              disabled={saving === '_global-font-scale'}
              className={`
                px-4 py-2 text-sm font-medium transition-colors duration-150
                ${currentFontScale === option.value
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                ${saving === '_global-font-scale' ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                border-r border-gray-200 last:border-r-0
              `}
            >
              {option.label}
              <span className={`ml-1.5 text-xs ${currentFontScale === option.value ? 'text-gray-300' : 'text-gray-400'}`}>
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Per-Page Settings Table */}
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
            {pageSettings.map((setting) => (
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
                            onClick={() => toggleMetadataFlag(setting.page_slug, setting.metadata as SectionMetadata, 'show_timeline')}
                            disabled={saving === `${setting.page_slug}-show_timeline`}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full
                              transition-colors duration-200
                              ${(setting.metadata as SectionMetadata)?.show_timeline ? 'bg-black' : 'bg-gray-300'}
                              ${saving === `${setting.page_slug}-show_timeline` ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                            `}
                            role="switch"
                            aria-checked={(setting.metadata as SectionMetadata)?.show_timeline ?? false}
                            aria-label="Toggle Timeline section"
                          >
                            <span
                              className={`
                                inline-block h-4 w-4 rounded-full bg-white
                                transition-transform duration-200
                                ${(setting.metadata as SectionMetadata)?.show_timeline ? 'translate-x-6' : 'translate-x-1'}
                              `}
                            />
                          </button>
                          <span className="text-xs text-gray-600">Timeline</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMetadataFlag(setting.page_slug, setting.metadata as SectionMetadata, 'show_movement')}
                            disabled={saving === `${setting.page_slug}-show_movement`}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full
                              transition-colors duration-200
                              ${(setting.metadata as SectionMetadata)?.show_movement ? 'bg-black' : 'bg-gray-300'}
                              ${saving === `${setting.page_slug}-show_movement` ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                            `}
                            role="switch"
                            aria-checked={(setting.metadata as SectionMetadata)?.show_movement ?? false}
                            aria-label="Toggle Movement section"
                          >
                            <span
                              className={`
                                inline-block h-4 w-4 rounded-full bg-white
                                transition-transform duration-200
                                ${(setting.metadata as SectionMetadata)?.show_movement ? 'translate-x-6' : 'translate-x-1'}
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
