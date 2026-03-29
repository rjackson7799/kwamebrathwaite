'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { FormField, Input, Textarea, Select, Checkbox } from './FormField'
import { ImageUploader } from './ImageUploader'
import { RichTextEditor } from './RichTextEditor'
import { Wand2, Loader2, AlertCircle, Check } from 'lucide-react'

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
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summarySuccess, setSummarySuccess] = useState(false)
  const [wordCount, setWordCount] = useState(100)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
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

  const watchedUrl = watch('url')
  const isValidUrl = (() => {
    if (!watchedUrl) return false
    try {
      new URL(watchedUrl)
      return true
    } catch {
      return false
    }
  })()

  const handleGenerateSummary = async () => {
    const currentUrl = getValues('url')
    if (!currentUrl) return

    setSummarizing(true)
    setSummaryError(null)
    setSummarySuccess(false)

    try {
      const response = await fetch('/api/admin/press/summarize-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl, wordCount }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to generate summary')
      }

      const data = result.data
      const currentValues = getValues()

      // Always set excerpt (primary output)
      setValue('excerpt', data.summary)

      // Only auto-fill empty fields
      if (!currentValues.title && data.title) setValue('title', data.title)
      if (!currentValues.publication && data.publication) setValue('publication', data.publication)
      if (!currentValues.author && data.author) setValue('author', data.author)
      if (!currentValues.publish_date && data.publish_date) setValue('publish_date', data.publish_date)

      setSummarySuccess(true)
      setTimeout(() => setSummarySuccess(false), 2000)
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setSummarizing(false)
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
                label="Article Summary"
                htmlFor="excerpt"
                hint="Article summary or quote - supports rich text formatting"
              >
                <Controller
                  name="excerpt"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Enter article summary..."
                    />
                  )}
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

              {/* AI Summary Generator */}
              {isValidUrl && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor="wordCount" className="text-sm text-gray-600 whitespace-nowrap">
                        Words:
                      </label>
                      <input
                        id="wordCount"
                        type="number"
                        min={50}
                        max={600}
                        value={wordCount}
                        onChange={(e) => setWordCount(Math.min(600, Math.max(50, parseInt(e.target.value) || 100)))}
                        className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={summarizing}
                      className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {summarizing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : summarySuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          Done
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Generate Summary
                        </>
                      )}
                    </button>
                  </div>
                  {summaryError && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{summaryError}</span>
                      <button
                        type="button"
                        onClick={handleGenerateSummary}
                        className="text-red-700 underline hover:text-red-800"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}
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
