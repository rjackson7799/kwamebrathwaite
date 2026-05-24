'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RichTextEditor } from './RichTextEditor'

interface BriefingFormValues {
  id?: string
  title: string
  excerpt: string | null
  body_html: string
  status?: 'draft' | 'published' | 'archived'
}

interface BriefingFormProps {
  initial?: BriefingFormValues
  mode: 'create' | 'edit'
}

export function BriefingForm({ initial, mode }: BriefingFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html ?? '')

  async function save(opts: { thenPublish?: boolean } = {}): Promise<string | null> {
    setError(null)
    setSaving(true)

    try {
      if (mode === 'create') {
        const res = await fetch('/api/admin/briefings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            excerpt: excerpt.trim() || null,
            body_html: bodyHtml,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          setError(json.error?.message ?? 'Failed to create briefing')
          return null
        }
        const newId = json.data.briefing.id as string
        if (!opts.thenPublish) {
          router.push(`/admin/briefings/${newId}`)
        }
        return newId
      }

      // edit
      const res = await fetch(`/api/admin/briefings/${initial!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt: excerpt.trim() || null,
          body_html: bodyHtml,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to save briefing')
        return null
      }
      return initial!.id ?? null
    } finally {
      setSaving(false)
    }
  }

  async function publish(idOverride?: string) {
    const id = idOverride ?? initial?.id
    if (!id) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/briefings/${id}/publish`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message ?? 'Failed to publish briefing')
        return
      }
      router.push(`/admin/briefings/${id}`)
      router.refresh()
    } finally {
      setPublishing(false)
    }
  }

  async function handleSaveAndPublish(e: React.FormEvent) {
    e.preventDefault()
    const id = await save({ thenPublish: true })
    if (id) await publish(id)
  }

  async function handleSaveOnly(e: React.FormEvent) {
    e.preventDefault()
    await save()
  }

  const isPublished = initial?.status === 'published'

  return (
    <form className="max-w-3xl bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Title *</label>
        <input
          required
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Excerpt (optional, shown in the briefings list + notification email)
        </label>
        <textarea
          rows={2}
          className="input resize-none"
          maxLength={500}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-400">{excerpt.length} / 500</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Body</label>
        <RichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          placeholder="Write the briefing..."
        />
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
        <Link
          href="/admin/briefings"
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          onClick={handleSaveOnly}
          disabled={saving || publishing}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        {!isPublished ? (
          <button
            onClick={handleSaveAndPublish}
            disabled={saving || publishing}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : saving ? 'Saving…' : 'Save & publish'}
          </button>
        ) : (
          <span className="ml-auto text-xs text-gray-500 italic">
            Published — saves update the live briefing.
          </span>
        )}
      </div>
    </form>
  )
}
