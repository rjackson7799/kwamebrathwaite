'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { FormField, Input, Textarea, Select, Checkbox } from './FormField'
import { ImageUploader } from './ImageUploader'
import { RichTextEditor } from './RichTextEditor'
import { ArtworkPicker } from './ArtworkPicker'
import { AIGenerationPanel } from './AIGenerationPanel'

interface ArtworkFormData {
  title: string
  year?: number | null
  medium?: string | null
  dimensions?: string | null
  description?: string | null
  short_description?: string | null
  seo_title?: string | null
  alt_text?: string | null
  image_url: string
  image_thumbnail_url?: string | null
  category?: 'photography' | 'print' | 'historical' | null
  series?: string | null
  availability_status: 'available' | 'sold' | 'on_loan' | 'not_for_sale' | 'inquiry_only'
  is_featured: boolean
  related_artwork_ids: string[]
  status: 'draft' | 'published' | 'archived'
  meta_title?: string | null
  meta_description?: string | null
}

interface GeneratedContent {
  description: string
  short_description: string
  seo_title: string
  alt_text: string
  suggested_tags: string[]
  confidence_score: number
  translations: {
    fr: { description: string; short_description: string; seo_title: string; alt_text: string }
    ja: { description: string; short_description: string; seo_title: string; alt_text: string }
  }
}

interface ArtworkFormProps {
  artwork?: ArtworkFormData & { id: string }
  isEdit?: boolean
}

export function ArtworkForm({ artwork, isEdit = false }: ArtworkFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ArtworkFormData>({
    defaultValues: artwork || {
      title: '',
      year: null,
      medium: null,
      dimensions: null,
      description: null,
      short_description: null,
      seo_title: null,
      alt_text: null,
      image_url: '',
      image_thumbnail_url: null,
      category: null,
      series: null,
      availability_status: 'available',
      is_featured: false,
      related_artwork_ids: [],
      status: 'draft',
      meta_title: null,
      meta_description: null,
    },
  })

  const imageUrl = watch('image_url')
  const watchedTitle = watch('title')
  const watchedYear = watch('year')
  const watchedMedium = watch('medium')
  const watchedDimensions = watch('dimensions')
  const watchedSeries = watch('series')

  // Handle AI-generated content application
  const handleAIGenerated = (content: GeneratedContent) => {
    setValue('description', content.description)
    setValue('short_description', content.short_description)
    setValue('seo_title', content.seo_title)
    setValue('alt_text', content.alt_text)
    // Also set meta_title as a fallback if not already set
    if (!watch('meta_title')) {
      setValue('meta_title', content.seo_title)
    }
  }

  const onSubmit = async (data: ArtworkFormData) => {
    setSaving(true)
    setError(null)

    try {
      const url = isEdit
        ? `/api/admin/artworks/${artwork?.id}`
        : '/api/admin/artworks'

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || 'Failed to save artwork')
        return
      }

      router.push('/admin/artworks')
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
                  placeholder="Enter artwork title"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Year" htmlFor="year">
                  <Input
                    id="year"
                    type="number"
                    {...register('year', { valueAsNumber: true })}
                    placeholder="e.g., 1968"
                  />
                </FormField>

                <FormField label="Medium" htmlFor="medium">
                  <Input
                    id="medium"
                    {...register('medium')}
                    placeholder="e.g., Gelatin silver print"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Dimensions" htmlFor="dimensions">
                  <Input
                    id="dimensions"
                    {...register('dimensions')}
                    placeholder="e.g., 20 x 24 inches"
                  />
                </FormField>

                <FormField label="Series" htmlFor="series">
                  <Input
                    id="series"
                    {...register('series')}
                    placeholder="e.g., Grandassa Models"
                  />
                </FormField>
              </div>

              <FormField label="Category" htmlFor="category">
                <Select id="category" {...register('category')}>
                  <option value="">Select category</option>
                  <option value="photography">Photography</option>
                  <option value="print">Print</option>
                  <option value="historical">Historical</option>
                </Select>
              </FormField>
            </div>
          </div>

          {/* AI Generation Panel - Only show for existing artworks with images */}
          {isEdit && artwork?.id && imageUrl && (
            <AIGenerationPanel
              artworkId={artwork.id}
              imageUrl={imageUrl}
              currentMetadata={{
                title: watchedTitle,
                year: watchedYear,
                medium: watchedMedium,
                dimensions: watchedDimensions,
                series: watchedSeries,
              }}
              onGenerated={handleAIGenerated}
            />
          )}

          {/* Description Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Enter artwork description..."
                />
              )}
            />

            {/* Short Description field */}
            <div className="mt-4">
              <FormField
                label="Short Description"
                htmlFor="short_description"
                hint="50-word summary for gallery cards"
              >
                <Textarea
                  id="short_description"
                  {...register('short_description')}
                  rows={2}
                  placeholder="Brief description for preview cards..."
                />
              </FormField>
            </div>
          </div>

          {/* SEO & Accessibility Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">SEO & Accessibility</h3>
            <div className="space-y-4">
              <FormField
                label="SEO Title"
                htmlFor="seo_title"
                hint="Keyword-rich title for search (max 60 characters)"
              >
                <Input
                  id="seo_title"
                  {...register('seo_title')}
                  placeholder="e.g., Jazz Musicians AJASS Studio 1966"
                  maxLength={60}
                />
              </FormField>

              <FormField
                label="Alt Text"
                htmlFor="alt_text"
                hint="Image description for screen readers (max 125 characters)"
              >
                <Input
                  id="alt_text"
                  {...register('alt_text')}
                  placeholder="e.g., Black and white photograph showing..."
                  maxLength={125}
                />
              </FormField>

              <FormField
                label="Meta Title"
                htmlFor="meta_title"
                hint="Leave blank to use SEO title or artwork title"
              >
                <Input
                  id="meta_title"
                  {...register('meta_title')}
                  placeholder="Custom page title"
                />
              </FormField>

              <FormField
                label="Meta Description"
                htmlFor="meta_description"
                hint="Recommended: 150-160 characters"
              >
                <Textarea
                  id="meta_description"
                  {...register('meta_description')}
                  rows={3}
                  placeholder="Brief description for search engines"
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
            <Controller
              name="image_url"
              control={control}
              rules={{ required: 'Image is required' }}
              render={({ field }) => (
                <ImageUploader
                  bucket="artworks"
                  value={field.value}
                  onChange={field.onChange}
                  onThumbnailChange={(url) => setValue('image_thumbnail_url', url)}
                />
              )}
            />
            {errors.image_url && (
              <p className="mt-2 text-sm text-red-600">{errors.image_url.message}</p>
            )}
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
            <div className="space-y-4">
              <FormField label="Publication Status" htmlFor="status">
                <Select id="status" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormField>

              <FormField label="Availability" htmlFor="availability_status">
                <Select id="availability_status" {...register('availability_status')}>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="on_loan">On Loan</option>
                  <option value="not_for_sale">Not for Sale</option>
                  <option value="inquiry_only">Inquiry Only</option>
                </Select>
              </FormField>

              <Controller
                name="is_featured"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Featured artwork"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          {/* Related Artworks Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Related Artworks</h3>
            <Controller
              name="related_artwork_ids"
              control={control}
              render={({ field }) => (
                <ArtworkPicker
                  value={field.value}
                  onChange={field.onChange}
                  max={3}
                  excludeId={artwork?.id}
                />
              )}
            />
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
            {saving ? 'Saving...' : isEdit ? 'Update Artwork' : 'Create Artwork'}
          </button>
        </div>
      </div>
    </form>
  )
}
