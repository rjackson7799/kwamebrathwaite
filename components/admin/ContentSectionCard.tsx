'use client'

import { useState, useCallback } from 'react'
import { RichTextEditor } from './RichTextEditor'

interface ContentSectionCardProps {
  page: string
  section: string
  content: string
  contentType: string
  updatedAt: string | null
  onSave: (content: string) => Promise<void>
}

export function ContentSectionCard({
  page,
  section,
  content: initialContent,
  contentType,
  updatedAt,
  onSave,
}: ContentSectionCardProps) {
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const hasChanges = content !== initialContent

  const handleSave = useCallback(async () => {
    // Validate JSON before saving
    if (contentType === 'json') {
      try {
        JSON.parse(content || '[]')
        setJsonError(null)
      } catch {
        setJsonError('Invalid JSON format')
        return
      }
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await onSave(content)
      setSaved(true)
      // Clear saved message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [content, contentType, onSave])

  const handleJsonChange = (value: string) => {
    setContent(value)
    // Validate JSON as user types
    try {
      JSON.parse(value || '[]')
      setJsonError(null)
    } catch {
      setJsonError('Invalid JSON format')
    }
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(content || '[]')
      setContent(JSON.stringify(parsed, null, 2))
      setJsonError(null)
    } catch {
      setJsonError('Cannot format: Invalid JSON')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Convert section name to display title (e.g., "hero_title" -> "Hero Title")
  const sectionTitle = section
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // Render the appropriate editor based on content type
  const renderEditor = () => {
    switch (contentType) {
      case 'text':
        return (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter ${sectionTitle.toLowerCase()}...`}
            disabled={saving}
            rows={3}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-500
              resize-y
            `}
          />
        )

      case 'json':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">JSON Editor</span>
              <button
                type="button"
                onClick={formatJson}
                disabled={saving}
                className="text-xs text-gray-600 hover:text-gray-900 underline disabled:opacity-50"
              >
                Format JSON
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={`[\n  {\n    "key": "value"\n  }\n]`}
              disabled={saving}
              rows={12}
              className={`
                w-full px-3 py-2 border rounded-md text-sm font-mono
                focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                disabled:bg-gray-50 disabled:text-gray-500
                resize-y
                ${jsonError ? 'border-red-300 bg-red-50' : 'border-gray-300'}
              `}
            />
            {jsonError && (
              <p className="text-xs text-red-600">{jsonError}</p>
            )}
          </div>
        )

      case 'html':
      case 'markdown':
      default:
        return (
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder={`Enter ${sectionTitle.toLowerCase()} content...`}
            disabled={saving}
          />
        )
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <ChevronIcon expanded={expanded} />
          <h3 className="font-medium text-gray-900">{sectionTitle}</h3>
          <span className={`
            text-xs px-2 py-0.5 rounded
            ${contentType === 'json' ? 'bg-purple-100 text-purple-700' : ''}
            ${contentType === 'text' ? 'bg-blue-100 text-blue-700' : ''}
            ${contentType === 'html' ? 'bg-green-100 text-green-700' : ''}
            ${contentType === 'markdown' ? 'bg-orange-100 text-orange-700' : ''}
            ${!['json', 'text', 'html', 'markdown'].includes(contentType) ? 'bg-gray-200 text-gray-500' : ''}
          `}>
            {contentType}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          Last updated: {formatDate(updatedAt)}
        </span>
      </button>

      {/* Content - collapsible */}
      {expanded && (
        <div className="p-4 space-y-4">
          {renderEditor()}

          {/* Footer with actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {error && (
                <span className="text-sm text-red-600">{error}</span>
              )}
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckIcon />
                  Saved
                </span>
              )}
              {hasChanges && !saved && !error && (
                <span className="text-sm text-amber-600">Unsaved changes</span>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || !!jsonError}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${
                  hasChanges && !saving && !jsonError
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
