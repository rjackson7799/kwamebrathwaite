'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { FormField, Input, Textarea, Select, Checkbox } from './FormField'
import { ImageUploader } from './ImageUploader'

interface PressFormData {
  title: string
  publication?: string | null
  author?: string | null
  publish_date?: string | null
  url?: string | null
  excerpt?: string | null
  image_url?: string | null
  press_type?: 'article' | 'review' | 'interview' | 'feature' | null
  is_featured: boolean
  display_order?: number | null
  status: 'draft' | 'published' | 'archived'
}

interface PressFormProps {
  press?: PressFormData & { id: string }
  isEdit?: boolean
}

export function PressForm({ press, isEdit = false }: PressFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PressFormData>({
    defaultValues: press || {
      title: '',
      publication: null,
      author: null,
      publish_date: null,
      url: null,
      excerpt: null,
      image_url: null,
      press_type: null,
      is_featured: false,
      display_order: null,
      status: 'draft',
    },
  })

  const onSubmit = async (data: PressFormData) => {
    setSaving(true)
    setError(null)

    try {
      const url = isEdit
        ? `/api/admin/press/${press?.id}`
        : '/api/admin/press'

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to save press item')
        return
      }

      router.push('/admin/press')
      router.refresh()
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <FormField
                label="Title"
                htmlFor="title"
                required
                error={errors.title?.message}
              >
                <Input
                  id="title"
                  {...register('title', { required: 'Title is required' })}
                  error={!!errors.title}
                  placeholder="Enter article title"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Publication" htmlFor="publication">
                  <Input
                    id="publication"
                    {...register('publication')}
                    placeholder="e.g., The New York Times"
                  />
                </FormField>

                <FormField label="Author" htmlFor="author">
                  <Input
                    id="author"
                    {...register('author')}
                    placeholder="e.g., John Smith"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Content</h3>
            <div className="space-y-4">
              <FormField
                label="Excerpt"
                htmlFor="excerpt"
                hint="Brief summary or quote from the article"
              >
                <Textarea
                  id="excerpt"
                  {...register('excerpt')}
                  rows={4}
                  placeholder="Enter a brief excerpt or summary..."
                />
              </FormField>

              <FormField
                label="External URL"
                htmlFor="url"
                hint="Link to the original article"
                error={errors.url?.message}
              >
                <Input
                  id="url"
                  type="url"
                  {...register('url')}
                  error={!!errors.url}
                  placeholder="https://example.com/article"
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Image Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Image</h3>
            <p className="text-sm text-gray-500 mb-4">
              Optional cover image for the press item
            </p>
            <Controller
              name="image_url"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  bucket="press"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
            <div className="space-y-4">
              <FormField label="Publish Date" htmlFor="publish_date">
                <Input
                  id="publish_date"
                  type="date"
                  {...register('publish_date')}
                />
              </FormField>

              <FormField label="Press Type" htmlFor="press_type">
                <Select id="press_type" {...register('press_type')}>
                  <option value="">Select type</option>
                  <option value="article">Article</option>
                  <option value="review">Review</option>
                  <option value="interview">Interview</option>
                  <option value="feature">Feature</option>
                </Select>
              </FormField>

              <Controller
                name="is_featured"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Featured press item"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            <FormField label="Publication Status" htmlFor="status">
              <Select id="status" {...register('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </FormField>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={() => {
                setValue('status', 'draft')
                handleSubmit(onSubmit)()
              }}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Save as Draft
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Press Item' : 'Create Press Item'}
          </button>
        </div>
      </div>
    </form>
  )
}
