'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface LicenseType {
  id: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export default function AdminLicenseTypesPage() {
  const router = useRouter()
  const [types, setTypes] = useState<LicenseType[]>([])
  const [loading, setLoading] = useState(true)

  // Create/Edit form
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formOrder, setFormOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<LicenseType | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/licensing/types')
      const data = await response.json()

      if (data.success) {
        setTypes(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch license types:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  const resetForm = () => {
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormOrder(types.length + 1)
    setFormActive(true)
    setShowForm(false)
  }

  const startEdit = (type: LicenseType) => {
    setEditingId(type.id)
    setFormName(type.name)
    setFormDescription(type.description || '')
    setFormOrder(type.display_order)
    setFormActive(type.is_active)
    setShowForm(true)
  }

  const startCreate = () => {
    resetForm()
    setFormOrder(types.length + 1)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)

    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        display_order: formOrder,
        is_active: formActive,
      }

      if (editingId) {
        await fetch(`/api/admin/licensing/types/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/admin/licensing/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      fetchTypes()
      resetForm()
    } catch (error) {
      console.error('Failed to save license type:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      await fetch(`/api/admin/licensing/types/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      fetchTypes()
      setDeleteTarget(null)
    } catch (error) {
      console.error('Failed to delete license type:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="License Types"
        description="Manage the types of licenses available for artwork usage"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Licensing', href: '/admin/licensing' },
          { label: 'Types' },
        ]}
        actions={
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
          >
            Add Type
          </button>
        }
      />

      <div className="p-8 max-w-3xl">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit License Type' : 'New License Type'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Editorial"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of this license type..."
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>

              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                    min="0"
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm w-24 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim()}
                  className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Types List */}
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : types.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No license types defined yet.</p>
        ) : (
          <div className="space-y-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{type.name}</h3>
                    {!type.is_active && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  {type.description && (
                    <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(type)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-black border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(type)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete License Type"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Existing license requests using this type will not be affected.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
