'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'

export default function NewFounderPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Minimal create form. Anything richer (tier/pledge/notes) can be filled in
  // on the detail page after creation. Keeping creation low-friction so admins
  // can move quickly off a phone call.
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization: '',
    personal_note: '',
    skip_invite: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/founders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          organization: form.organization || null,
          personal_note: form.personal_note || null,
          skip_invite: form.skip_invite,
        }),
      })
      const json = await res.json()
      if (json.success) {
        router.push(`/admin/founders/${json.data.founder.user_id}`)
      } else {
        alert(json.error?.message || 'Failed to create founder')
        setSaving(false)
      }
    } catch {
      alert('Failed to create founder')
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="New Founder"
        description="Add a Founder directly — for use when there's no inquiry record to convert."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Founders', href: '/admin/founders' },
          { label: 'New' },
        ]}
      />

      <div className="p-8">
        <form onSubmit={handleSubmit} className="max-w-xl bg-white border border-gray-200 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Full name *</label>
            <input
              required
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
            <input
              required
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone (optional)</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Organization (optional)</label>
            <input
              className="input"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Personal note in invitation email (optional)
            </label>
            <textarea
              rows={4}
              className="input resize-none"
              placeholder="A short personal note from you that will appear in the invitation email."
              value={form.personal_note}
              onChange={(e) => setForm({ ...form, personal_note: e.target.value })}
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.skip_invite}
              onChange={(e) => setForm({ ...form, skip_invite: e.target.checked })}
            />
            <span>
              Don&rsquo;t send the invitation email yet — create the record only, and I&rsquo;ll send the invitation manually from the detail page later.
            </span>
          </label>

          <div className="flex items-center gap-4 pt-2">
            <Link
              href="/admin/founders"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving
                ? 'Creating…'
                : form.skip_invite
                ? 'Create record'
                : 'Create & send invite'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
