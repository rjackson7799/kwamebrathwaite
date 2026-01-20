'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ImageUploader } from './ImageUploader'
import { FormField } from './FormField'
import type { HeroSlide } from '@/lib/supabase/types'

interface HeroSlideFormProps {
  slide?: HeroSlide
  nextDisplayOrder?: number
}

export function HeroSlideForm({ slide, nextDisplayOrder = 1 }: HeroSlideFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    image_url: slide?.image_url || '',
    overlay_opacity: slide?.overlay_opacity ?? 50,
    display_order: slide?.display_order ?? nextDisplayOrder,
    is_active: slide?.is_active ?? true,
    status: slide?.status || 'published',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const url = slide?.id
        ? `/api/admin/hero/${slide.id}`
        : '/api/admin/hero'

      const method = slide?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save slide')
      }

      router.push('/admin/hero')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save slide. Please try again.')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Live Preview */}
      <div className="mb-8">
        <label className="label mb-3">Live Preview</label>
        <div className="relative h-96 rounded-lg overflow-hidden border-2 border-gray-200">
          {formData.image_url ? (
            <>
              <Image
                src={formData.image_url}
                alt="Preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />
              {/* Adjustable Overlay */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/20 via-black to-black/20 transition-opacity duration-300"
                style={{ opacity: formData.overlay_opacity / 100 }}
              />
              {/* Preview Text */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center text-white px-4">
                  <p className="text-sm tracking-[0.08em] uppercase mb-2 opacity-90">
                    The Photography Archive
                  </p>
                  <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-2">
                    Kwame Brathwaite
                  </h1>
                  <p className="text-lg md:text-xl font-light opacity-90">
                    Founder of the Black is Beautiful movement
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Upload an image to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Upload */}
      <div className="mb-6">
        <label className="label">
          Hero Image <span className="text-red-500">*</span>
        </label>
        <ImageUploader
          bucket="hero"
          value={formData.image_url}
          onChange={(url) => setFormData({ ...formData, image_url: url || '' })}
          aspectRatio="16/9"
          maxSizeMB={10}
        />
        <p className="helper-text mt-2">
          Recommended: 1920×1080 or larger. High-quality JPG or PNG.
        </p>
      </div>

      {/* Opacity Slider */}
      <div className="mb-8">
        <label className="label">Dark Overlay Opacity</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={formData.overlay_opacity}
            onChange={(e) => setFormData({
              ...formData,
              overlay_opacity: Number(e.target.value)
            })}
            className="hero-opacity-slider flex-1 h-2 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-medium w-12 text-right">
            {formData.overlay_opacity}%
          </span>
        </div>
        <p className="helper-text mt-2">
          Adjust for optimal text readability. 50% is recommended for most images.
        </p>
        <div className="mt-2 text-xs text-gray-500">
          <strong>Guidelines:</strong> Dark images (30-40%), Medium (50-60%), Bright (60-70%)
        </div>
      </div>

      {/* Display Order */}
      <FormField
        label="Display Order"
        htmlFor="display_order"
        required
        hint="Order in which this slide appears in rotation"
      >
        <input
          id="display_order"
          type="number"
          min="1"
          value={formData.display_order}
          onChange={(e) => setFormData({
            ...formData,
            display_order: Number(e.target.value)
          })}
          className="input w-32"
          required
        />
      </FormField>

      {/* Active Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({
                ...formData,
                is_active: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-checked:bg-black rounded-full
                          peer-focus:ring-2 peer-focus:ring-black transition-colors" />
            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full
                          transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-medium">
            Active (show in rotation)
          </span>
        </label>
      </div>

      {/* Status */}
      <FormField label="Status" htmlFor="status">
        <select
          id="status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
          className="input"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </FormField>

      {/* Form Actions */}
      <div className="flex items-center gap-3 pt-6 border-t">
        <button
          type="submit"
          disabled={isSaving || !formData.image_url}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : slide?.id ? 'Update Slide' : 'Create Slide'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
