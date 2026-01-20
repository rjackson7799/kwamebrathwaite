'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { FormField, Input, Textarea, Select } from './FormField'
import { ImageUploader } from './ImageUploader'
import { RichTextEditor } from './RichTextEditor'
import { ArtworkPicker } from './ArtworkPicker'
import { AddressAutocomplete, type PlaceResult } from './AddressAutocomplete'
import { LocationMapPreview } from './LocationMapPreview'

interface ExhibitionFormData {
  title: string
  venue?: string | null
  street_address?: string | null
  city?: string | null
  state_region?: string | null
  postal_code?: string | null
  country?: string | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  image_url?: string | null
  exhibition_type?: 'past' | 'current' | 'upcoming' | null
  location_lat?: number | null
  location_lng?: number | null
  venue_url?: string | null
  status: 'draft' | 'published' | 'archived'
  meta_title?: string | null
  meta_description?: string | null
}

interface ExhibitionFormProps {
  exhibition?: ExhibitionFormData & { id: string }
  isEdit?: boolean
}

export function ExhibitionForm({ exhibition, isEdit = false }: ExhibitionFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedArtworkIds, setLinkedArtworkIds] = useState<string[]>([])

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
      venue: null,
      street_address: null,
      city: null,
      state_region: null,
      postal_code: null,
      country: null,
      start_date: null,
      end_date: null,
      description: null,
      image_url: null,
      exhibition_type: null,
      location_lat: null,
      location_lng: null,
      venue_url: null,
      status: 'draft',
      meta_title: null,
      meta_description: null,
    },
  })

  // Watch lat/lng for map preview
  const watchedLat = watch('location_lat')
  const watchedLng = watch('location_lng')
  const watchedVenue = watch('venue')

  // Handle place selection from autocomplete
  const handlePlaceSelected = (place: PlaceResult) => {
    console.log('handlePlaceSelected called with:', place)

    // Use empty string as fallback instead of null to ensure fields are updated
    setValue('venue', place.name || '')
    setValue('street_address', place.street || '')
    setValue('city', place.city || '')
    setValue('state_region', place.state || '')
    setValue('postal_code', place.postalCode || '')
    setValue('country', place.country || '')
    setValue('location_lat', place.lat)
    setValue('location_lng', place.lng)
  }

  // Handle map marker drag
  const handleLocationChange = (lat: number, lng: number) => {
    setValue('location_lat', lat)
    setValue('location_lng', lng)
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
        setError(result.error?.message || 'Failed to save exhibition')
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

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Venue" htmlFor="venue">
                  <Input
                    id="venue"
                    {...register('venue')}
                    placeholder="e.g., Museum of Modern Art"
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
                  defaultValue={watchedVenue || ''}
                  placeholder="Type venue name or address..."
                />
              </FormField>

              <FormField label="Street Address" htmlFor="street_address">
                <Input
                  id="street_address"
                  {...register('street_address')}
                  placeholder="123 Main Street"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="City" htmlFor="city">
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="New York"
                  />
                </FormField>

                <FormField label="State/Region" htmlFor="state_region">
                  <Input
                    id="state_region"
                    {...register('state_region')}
                    placeholder="NY"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Postal Code" htmlFor="postal_code">
                  <Input
                    id="postal_code"
                    {...register('postal_code')}
                    placeholder="10001"
                  />
                </FormField>

                <FormField label="Country" htmlFor="country">
                  <Input
                    id="country"
                    {...register('country')}
                    placeholder="United States"
                  />
                </FormField>
              </div>

              {/* Map Preview */}
              <LocationMapPreview
                lat={watchedLat}
                lng={watchedLng}
                onLocationChange={handleLocationChange}
              />

              {/* Coordinates (read-only) */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Latitude" htmlFor="location_lat" hint="Auto-filled from search">
                  <Input
                    id="location_lat"
                    type="number"
                    step="any"
                    {...register('location_lat', { valueAsNumber: true })}
                    placeholder="40.7128"
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </FormField>

                <FormField label="Longitude" htmlFor="location_lng" hint="Auto-filled from search">
                  <Input
                    id="location_lng"
                    type="number"
                    step="any"
                    {...register('location_lng', { valueAsNumber: true })}
                    placeholder="-74.0060"
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </FormField>
              </div>
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

          {/* Featured Artworks Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Featured Artworks</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select artworks to display with this exhibition.
            </p>
            <ArtworkPicker
              value={linkedArtworkIds}
              onChange={setLinkedArtworkIds}
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
