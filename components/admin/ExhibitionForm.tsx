'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { FormField, Input, Textarea, Select } from './FormField'
import { ImageUploader } from './ImageUploader'
import { RichTextEditor } from './RichTextEditor'
import { ArtworkPicker } from './ArtworkPicker'
import { PressPicker } from './PressPicker'
import { AddressAutocomplete, type PlaceResult } from './AddressAutocomplete'
import { LocationMapPreview } from './LocationMapPreview'
import { generateSlug } from '@/lib/utils'

interface ExhibitionFormData {
  title: string
  slug: string
  venue?: string | null
  city?: string | null
  country?: string | null
  formatted_address?: string | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  image_url?: string | null
  thumbnail_image_url?: string | null
  exhibition_type?: 'past' | 'current' | 'upcoming' | null
  location_lat?: number | null
  location_lng?: number | null
  venue_url?: string | null
  venue_description?: string | null
  exhibition_url?: string | null
  status: 'draft' | 'published' | 'archived'
  meta_title?: string | null
  meta_description?: string | null
  // Phase 2B — Founder Preview window. preview_starts_at is stored as
  // timestamptz in the DB; the datetime-local <input> binds to a
  // 'YYYY-MM-DDTHH:MM' string. The API accepts either form.
  preview_starts_at?: string | null
  preview_notes?: string | null
}

// Format an incoming timestamptz / ISO string for a datetime-local input.
// Returns 'YYYY-MM-DDTHH:MM' or '' for null/invalid.
function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return ''
  // Already in datetime-local shape (no timezone, 16 chars).
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

interface ExhibitionFormProps {
  exhibition?: ExhibitionFormData & { id: string; slug: string }
  isEdit?: boolean
}

export function ExhibitionForm({ exhibition, isEdit = false }: ExhibitionFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedArtworkIds, setLinkedArtworkIds] = useState<string[]>([])
  const [linkedPressIds, setLinkedPressIds] = useState<string[]>([])
  const [generatingDescription, setGeneratingDescription] = useState(false)
  const [generatingExhibitionDescription, setGeneratingExhibitionDescription] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExhibitionFormData>({
    defaultValues: exhibition || {
      title: '',
      slug: '',
      venue: null,
      city: null,
      country: null,
      formatted_address: null,
      start_date: null,
      end_date: null,
      description: null,
      image_url: null,
      thumbnail_image_url: null,
      exhibition_type: null,
      location_lat: null,
      location_lng: null,
      venue_url: null,
      venue_description: null,
      exhibition_url: null,
      status: 'draft',
      preview_starts_at: null,
      preview_notes: null,
      meta_title: null,
      meta_description: null,
    },
  })

  // Watch title to auto-generate slug for new exhibitions
  const watchedTitle = watch('title')
  const watchedSlug = watch('slug')

  // Auto-generate slug from title for new exhibitions
  useEffect(() => {
    if (!isEdit && watchedTitle && !watchedSlug) {
      setValue('slug', generateSlug(watchedTitle), { shouldDirty: true })
    }
  }, [watchedTitle, watchedSlug, isEdit, setValue])

  // Watch fields for display
  const watchedLat = watch('location_lat')
  const watchedLng = watch('location_lng')
  const watchedAddress = watch('formatted_address')
  const watchedVenue = watch('venue')
  const watchedVenueUrl = watch('venue_url')
  const watchedExhibitionUrl = watch('exhibition_url')

  // Handle place selection from autocomplete
  const handlePlaceSelected = (place: PlaceResult) => {
    console.log('handlePlaceSelected called with:', place)

    const options = { shouldDirty: true }

    setValue('venue', place.name || '', options)
    setValue('city', place.city || '', options)
    setValue('country', place.country || '', options)
    setValue('formatted_address', place.formattedAddress || '', options)
    setValue('location_lat', place.lat, options)
    setValue('location_lng', place.lng, options)
  }

  // Handle map marker drag
  const handleLocationChange = (lat: number, lng: number) => {
    const options = { shouldDirty: true }
    setValue('location_lat', lat, options)
    setValue('location_lng', lng, options)
  }

  const handleGenerateVenueDescription = async () => {
    const venueUrl = watch('venue_url')
    const venueName = watch('venue')
    if (!venueUrl || !venueName) return

    setGeneratingDescription(true)
    try {
      const response = await fetch('/api/admin/exhibitions/generate-venue-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_url: venueUrl, venue_name: venueName }),
      })
      const result = await response.json()
      if (result.success && result.data?.description) {
        setValue('venue_description', result.data.description, { shouldDirty: true })
      }
    } catch (err) {
      console.error('Failed to generate venue description:', err)
    } finally {
      setGeneratingDescription(false)
    }
  }

  const handleGenerateExhibitionDescription = async () => {
    const exhibitionUrl = watch('exhibition_url')
    const title = watch('title')
    if (!exhibitionUrl || !title) return

    setGeneratingExhibitionDescription(true)
    try {
      const response = await fetch('/api/admin/exhibitions/generate-exhibition-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhibition_url: exhibitionUrl, exhibition_title: title }),
      })
      const result = await response.json()
      if (result.success && result.data?.description) {
        setValue('description', result.data.description, { shouldDirty: true })
      }
    } catch (err) {
      console.error('Failed to generate exhibition description:', err)
    } finally {
      setGeneratingExhibitionDescription(false)
    }
  }

  // Load linked artworks when editing
  useEffect(() => {
    if (isEdit && exhibition?.id) {
      fetch(`/api/admin/exhibitions/${exhibition.id}/artworks`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setLinkedArtworkIds(result.data.map((item: { artwork_id: string }) => item.artwork_id))
          }
        })
        .catch(console.error)
    }
  }, [isEdit, exhibition?.id])

  useEffect(() => {
    if (isEdit && exhibition?.id) {
      fetch(`/api/admin/exhibitions/${exhibition.id}/press`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setLinkedPressIds(result.data.map((item: { press_id: string }) => item.press_id))
          }
        })
        .catch(console.error)
    }
  }, [isEdit, exhibition?.id])

  const onSubmit = async (data: ExhibitionFormData) => {
    setSaving(true)
    setError(null)

    try {
      const url = isEdit
        ? `/api/admin/exhibitions/${exhibition?.id}`
        : '/api/admin/exhibitions'

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        const base = result.error?.message || 'Failed to save exhibition'
        const det = result.error?.details
        const extras: string[] = []
        if (det && typeof det === 'object' && det !== null) {
          const o = det as Record<string, unknown>
          if (typeof o.hint === 'string' && o.hint) extras.push(o.hint)
          if (typeof o.code === 'string' && o.code) extras.push(`Code: ${o.code}`)
        }
        setError(extras.length ? `${base} — ${extras.join(' · ')}` : base)
        setSaving(false)
        return
      }

      // Save linked artworks
      const exhibitionId = isEdit ? exhibition?.id : result.data?.id
      if (exhibitionId && linkedArtworkIds.length >= 0) {
        await fetch(`/api/admin/exhibitions/${exhibitionId}/artworks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artworkIds: linkedArtworkIds }),
        })
      }

      // Save linked press
      if (exhibitionId) {
        await fetch(`/api/admin/exhibitions/${exhibitionId}/press`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pressIds: linkedPressIds }),
        })
      }

      router.push('/admin/exhibitions')
      router.refresh()
    } catch (err) {
      setError('An error occurred. Please try again.')
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
                  placeholder="Enter exhibition title"
                />
              </FormField>

              <FormField
                label="URL Slug"
                htmlFor="slug"
                required
                error={errors.slug?.message}
                hint="Auto-generated from title. Used in the URL: /exhibitions/your-slug"
              >
                <Input
                  id="slug"
                  {...register('slug', {
                    required: 'Slug is required',
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message: 'Slug must be lowercase letters, numbers, and hyphens only',
                    },
                  })}
                  error={!!errors.slug}
                  placeholder="exhibition-url-slug"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Venue" htmlFor="venue">
                  <Controller
                    name="venue"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="venue"
                        {...field}
                        value={field.value || ''}
                        placeholder="e.g., Museum of Modern Art"
                      />
                    )}
                  />
                </FormField>

                <FormField label="Exhibition Type" htmlFor="exhibition_type">
                  <Select id="exhibition_type" {...register('exhibition_type')}>
                    <option value="">Select type</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="current">Current</option>
                    <option value="past">Past</option>
                  </Select>
                </FormField>
              </div>

              <FormField label="Venue URL" htmlFor="venue_url">
                <Input
                  id="venue_url"
                  type="url"
                  {...register('venue_url')}
                  placeholder="https://example.com"
                />
              </FormField>

              <FormField
                label="Exhibition URL"
                htmlFor="exhibition_url"
                hint="Link to this specific exhibition on the venue's website"
              >
                <Input
                  id="exhibition_url"
                  type="url"
                  {...register('exhibition_url')}
                  placeholder="https://museum.org/exhibitions/kwame-brathwaite"
                />
              </FormField>

              <FormField
                label="Venue Description"
                htmlFor="venue_description"
                hint="Brief description of the venue for the public exhibition page"
              >
                <div className="space-y-2">
                  <Textarea
                    id="venue_description"
                    {...register('venue_description')}
                    rows={3}
                    placeholder="Brief description of the venue..."
                  />
                  <button
                    type="button"
                    onClick={handleGenerateVenueDescription}
                    disabled={!watchedVenueUrl || !watchedVenue || generatingDescription}
                    className="text-sm text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generatingDescription ? (
                      <>
                        <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      '✨ Generate from venue URL'
                    )}
                  </button>
                </div>
              </FormField>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
            <div className="space-y-4">
              {/* Address Autocomplete Search */}
              <FormField label="Search Venue" htmlFor="venue_search">
                <AddressAutocomplete
                  onPlaceSelected={handlePlaceSelected}
                  defaultValue=""
                  placeholder="Type venue name or address..."
                />
              </FormField>

              {/* Display selected location */}
              {(watchedVenue || watchedAddress) && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-1">
                    {watchedVenue && (
                      <p className="font-medium text-gray-900">{watchedVenue}</p>
                    )}
                    {watchedAddress && (
                      <p className="text-sm text-gray-600">{watchedAddress}</p>
                    )}
                    {watchedLat && watchedLng && (
                      <p className="text-xs text-gray-400 mt-2">
                        Coordinates: {watchedLat.toFixed(6)}, {watchedLng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Map Preview */}
              <LocationMapPreview
                lat={watchedLat}
                lng={watchedLng}
                onLocationChange={handleLocationChange}
              />

              {/* Hidden fields for form data */}
              <input type="hidden" {...register('city')} />
              <input type="hidden" {...register('country')} />
              <input type="hidden" {...register('formatted_address')} />
              <Controller
                name="location_lat"
                control={control}
                render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />}
              />
              <Controller
                name="location_lng"
                control={control}
                render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />}
              />
            </div>
          </div>

          {/* Dates Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" htmlFor="start_date">
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                />
              </FormField>

              <FormField label="End Date" htmlFor="end_date">
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                />
              </FormField>
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
            <div className="space-y-2">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Enter exhibition description..."
                  />
                )}
              />
              <button
                type="button"
                onClick={handleGenerateExhibitionDescription}
                disabled={!watchedExhibitionUrl || !watch('title') || generatingExhibitionDescription}
                className="text-sm text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {generatingExhibitionDescription ? (
                  <>
                    <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  '✨ Generate from exhibition URL'
                )}
              </button>
            </div>
          </div>

          {/* SEO Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">SEO</h3>
            <div className="space-y-4">
              <FormField
                label="Meta Title"
                htmlFor="meta_title"
                hint="Leave blank to use exhibition title"
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
              render={({ field }) => (
                <ImageUploader
                  bucket="exhibitions"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Thumbnail Image Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Thumbnail Image</h3>
            <p className="text-sm text-gray-500 mb-4">Square crop for listing cards. Falls back to main image if not set.</p>
            <Controller
              name="thumbnail_image_url"
              control={control}
              render={({ field }) => (
                <ImageUploader
                  bucket="exhibitions"
                  value={field.value || ''}
                  onChange={field.onChange}
                  aspectRatio="1/1"
                />
              )}
            />
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

          {/* Founder Preview Card (Phase 2B) */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Founder Preview
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              When the preview starts, active Founder&rsquo;s Circle members
              can read this exhibition in their portal even while it&rsquo;s
              still a draft.
            </p>

            <FormField label="Preview starts at" htmlFor="preview_starts_at">
              <Controller
                name="preview_starts_at"
                control={control}
                render={({ field }) => (
                  <input
                    id="preview_starts_at"
                    type="datetime-local"
                    value={toDateTimeLocal(field.value)}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                )}
              />
              <p className="mt-1 text-xs text-gray-400">
                Leave blank to disable the preview. Once you flip the
                exhibition to <em>Published</em>, founders see it via the
                public canonical page instead.
              </p>
            </FormField>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Curator&rsquo;s note (founder-only)
              </label>
              <Controller
                name="preview_notes"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Optional. Shown to founders above the public description."
                  />
                )}
              />
              <p className="text-xs text-gray-400">
                Never appears on the public site. Translated for FR/JA on
                first read.
              </p>
            </div>
          </div>

          {/* Featured Artworks Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Featured Artworks</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select artworks to display with this exhibition.
            </p>
            <ArtworkPicker
              value={linkedArtworkIds}
              onChange={setLinkedArtworkIds}
              max={8}
            />
          </div>

          {/* Press Coverage Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Press Coverage</h3>
            <p className="text-sm text-gray-500 mb-4">
              Link press articles to this exhibition.
            </p>
            <PressPicker
              value={linkedPressIds}
              onChange={setLinkedPressIds}
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
            {saving ? 'Saving...' : isEdit ? 'Update Exhibition' : 'Create Exhibition'}
          </button>
        </div>
      </div>
    </form>
  )
}
