'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

// Form schema (client-side validation)
const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  company: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  license_type_id: z.string().uuid('Please select a license type'),
  territory: z.string().max(255).optional(),
  duration: z.string().max(100).optional(),
  print_run: z.string().max(100).optional(),
  usage_description: z.string().min(1, 'Usage description is required').max(5000),
})

type FormData = z.infer<typeof formSchema>

type Artwork = {
  id: string
  title: string
  image_url: string
  image_thumbnail_url: string | null
  year: number | null
}

type LicenseType = {
  id: string
  name: string
  description: string | null
}

interface LicenseRequestFormProps {
  preselectedArtworkId?: string
}

const STEPS = ['artworks', 'licenseType', 'details', 'contact', 'review'] as const
type Step = typeof STEPS[number]

export function LicenseRequestForm({ preselectedArtworkId }: LicenseRequestFormProps) {
  const t = useTranslations('licensing.request')
  const locale = useLocale()

  const [currentStep, setCurrentStep] = useState<number>(0)
  const [selectedArtworks, setSelectedArtworks] = useState<Artwork[]>([])
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([])
  const [artworkSearchQuery, setArtworkSearchQuery] = useState('')
  const [artworkSearchResults, setArtworkSearchResults] = useState<Artwork[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; requestNumber?: string; message: string } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      license_type_id: '',
      territory: '',
      duration: '',
      print_run: '',
      usage_description: '',
      name: '',
      email: '',
      company: '',
      phone: '',
    },
  })

  const watchedLicenseTypeId = watch('license_type_id')

  // Fetch license types on mount
  useEffect(() => {
    fetch('/api/licensing/types')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setLicenseTypes(res.data)
        }
      })
      .catch(console.error)
  }, [])

  // Fetch preselected artwork
  useEffect(() => {
    if (preselectedArtworkId) {
      fetch(`/api/artworks/${preselectedArtworkId}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            const artwork = res.data as Artwork
            setSelectedArtworks([artwork])
          }
        })
        .catch(console.error)
    }
  }, [preselectedArtworkId])

  // Search artworks
  const searchArtworks = useCallback(async (query: string) => {
    if (query.length < 2) {
      setArtworkSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/artworks?q=${encodeURIComponent(query)}&limit=12&status=published`)
      const json = await res.json()
      if (json.success) {
        setArtworkSearchResults(json.data || [])
      }
    } catch {
      console.error('Failed to search artworks')
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchArtworks(artworkSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [artworkSearchQuery, searchArtworks])

  const toggleArtwork = (artwork: Artwork) => {
    setSelectedArtworks((prev) => {
      const exists = prev.find((a) => a.id === artwork.id)
      if (exists) {
        return prev.filter((a) => a.id !== artwork.id)
      }
      if (prev.length >= 10) return prev
      return [...prev, artwork]
    })
  }

  const stepLabels = [
    t('stepArtworks'),
    t('stepLicenseType'),
    t('stepDetails'),
    t('stepContact'),
    t('stepReview'),
  ]

  const canGoNext = (): boolean => {
    switch (STEPS[currentStep]) {
      case 'artworks':
        return selectedArtworks.length > 0
      case 'licenseType':
        return !!watchedLicenseTypeId
      case 'details':
      case 'contact':
        return true // validated on next click
      case 'review':
        return true
      default:
        return false
    }
  }

  const goNext = async () => {
    // Validate current step fields before advancing
    if (STEPS[currentStep] === 'details') {
      const valid = await trigger(['usage_description'])
      if (!valid) return
    }
    if (STEPS[currentStep] === 'contact') {
      const valid = await trigger(['name', 'email'])
      if (!valid) return
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      const res = await fetch('/api/licensing/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          artwork_ids: selectedArtworks.map((a) => a.id),
          locale,
        }),
      })

      const json = await res.json()

      if (json.success) {
        setSubmitResult({
          success: true,
          requestNumber: json.data.request_number,
          message: t('success', { requestNumber: json.data.request_number }),
        })
      } else {
        setSubmitResult({
          success: false,
          message: json.error?.message || t('error'),
        })
      }
    } catch {
      setSubmitResult({ success: false, message: t('error') })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (submitResult?.success) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-display-4 mb-4">{t('title')}</h2>
        <p className="text-body-lg text-gray-warm max-w-lg mx-auto">{submitResult.message}</p>
      </div>
    )
  }

  const selectedLicenseType = licenseTypes.find((lt) => lt.id === watchedLicenseTypeId)

  return (
    <div>
      <h1 className="text-display-3 mb-8">{t('title')}</h1>

      {/* Step indicator */}
      <div className="flex items-center mb-10 overflow-x-auto">
        {stepLabels.map((label, index) => (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index === currentStep
                    ? 'bg-black text-white dark:bg-[#F0F0F0] dark:text-[#121212]'
                    : index < currentStep
                    ? 'bg-black/10 text-black dark:bg-white/10 dark:text-[#F0F0F0]'
                    : 'bg-gray-100 text-gray-400 dark:bg-[#2A2A2A] dark:text-[#666666]'
                }`}
              >
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-sm ${index === currentStep ? 'font-medium text-black dark:text-[#F0F0F0]' : 'text-gray-400 dark:text-[#666666]'}`}>
                {label}
              </span>
            </div>
            {index < stepLabels.length - 1 && (
              <div className={`w-8 h-px mx-2 ${index < currentStep ? 'bg-black dark:bg-[#F0F0F0]' : 'bg-gray-200 dark:bg-[#333333]'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Honeypot */}
        <input
          type="text"
          name="website"
          style={{ display: 'none' }}
          tabIndex={-1}
          autoComplete="off"
        />

        {/* Step 1: Select Artworks */}
        {STEPS[currentStep] === 'artworks' && (
          <div>
            <div className="mb-6">
              <input
                type="text"
                placeholder={t('artworkSearch')}
                value={artworkSearchQuery}
                onChange={(e) => setArtworkSearchQuery(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Search Results */}
            {artworkSearchResults.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {artworkSearchResults.map((artwork) => {
                  const isSelected = selectedArtworks.some((a) => a.id === artwork.id)
                  return (
                    <button
                      key={artwork.id}
                      type="button"
                      onClick={() => toggleArtwork(artwork)}
                      className={`relative border-2 p-2 text-left transition-colors ${
                        isSelected ? 'border-black dark:border-[#F0F0F0]' : 'border-gray-light dark:border-[#333333] hover:border-gray-400 dark:hover:border-[#666666]'
                      }`}
                    >
                      <div className="aspect-square relative mb-2">
                        {artwork.image_thumbnail_url || artwork.image_url ? (
                          <Image
                            src={artwork.image_thumbnail_url || artwork.image_url}
                            alt={artwork.title}
                            fill
                            className="object-cover"
                            sizes="150px"
                          />
                        ) : (
                          <ImagePlaceholder />
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black text-white dark:bg-[#F0F0F0] dark:text-[#121212] flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">{artwork.title}</p>
                      {artwork.year && <p className="text-xs text-gray-warm">{artwork.year}</p>}
                    </button>
                  )
                })}
              </div>
            )}

            {isSearching && (
              <p className="text-body text-gray-warm text-center py-4">Searching...</p>
            )}

            {/* Selected Artworks */}
            <div className="border-t border-gray-light dark:border-[#333333] pt-6">
              <h3 className="text-body-lg font-medium mb-2">
                {t('selectedArtworks')} ({selectedArtworks.length}/10)
              </h3>
              {selectedArtworks.length === 0 ? (
                <p className="text-body text-gray-warm">{t('noArtworksSelected')}</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {selectedArtworks.map((artwork) => (
                    <div key={artwork.id} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-2 border border-gray-light dark:border-[#333333]">
                      <div className="w-10 h-10 relative flex-shrink-0">
                        {artwork.image_thumbnail_url || artwork.image_url ? (
                          <Image
                            src={artwork.image_thumbnail_url || artwork.image_url}
                            alt={artwork.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <ImagePlaceholder />
                        )}
                      </div>
                      <span className="text-sm truncate max-w-[120px]">{artwork.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleArtwork(artwork)}
                        className="text-gray-400 hover:text-black dark:hover:text-[#F0F0F0] ml-1"
                        aria-label={`Remove ${artwork.title}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: License Type */}
        {STEPS[currentStep] === 'licenseType' && (
          <div className="space-y-4">
            {licenseTypes.map((type) => (
              <label
                key={type.id}
                className={`block border-2 p-5 cursor-pointer transition-colors ${
                  watchedLicenseTypeId === type.id
                    ? 'border-black dark:border-[#F0F0F0] bg-gray-50 dark:bg-white/5'
                    : 'border-gray-light dark:border-[#333333] hover:border-gray-400 dark:hover:border-[#666666]'
                }`}
              >
                <input
                  type="radio"
                  value={type.id}
                  {...register('license_type_id')}
                  className="sr-only"
                />
                <span className="text-body-lg font-medium">{type.name}</span>
                {type.description && (
                  <p className="text-body text-gray-warm mt-1">{type.description}</p>
                )}
              </label>
            ))}
            {errors.license_type_id && (
              <p className="text-sm text-red-600 dark:text-[#EF5350]">{errors.license_type_id.message}</p>
            )}
          </div>
        )}

        {/* Step 3: Usage Details */}
        {STEPS[currentStep] === 'details' && (
          <div className="space-y-6">
            <div>
              <label className="label" htmlFor="territory">{t('territory')}</label>
              <input
                type="text"
                id="territory"
                placeholder={t('territoryPlaceholder')}
                className="input w-full"
                {...register('territory')}
              />
            </div>

            <div>
              <label className="label" htmlFor="duration">{t('duration')}</label>
              <input
                type="text"
                id="duration"
                placeholder={t('durationPlaceholder')}
                className="input w-full"
                {...register('duration')}
              />
            </div>

            <div>
              <label className="label" htmlFor="print_run">{t('printRun')}</label>
              <input
                type="text"
                id="print_run"
                placeholder={t('printRunPlaceholder')}
                className="input w-full"
                {...register('print_run')}
              />
            </div>

            <div>
              <label className="label" htmlFor="usage_description">{t('usageDescription')}</label>
              <textarea
                id="usage_description"
                rows={5}
                placeholder={t('usageDescriptionPlaceholder')}
                className="input w-full resize-none"
                {...register('usage_description')}
              />
              {errors.usage_description && (
                <p className="text-sm text-red-600 dark:text-[#EF5350] mt-1">{errors.usage_description.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Contact Info */}
        {STEPS[currentStep] === 'contact' && (
          <div className="space-y-6">
            <div>
              <label className="label" htmlFor="name">{t('name')}</label>
              <input
                type="text"
                id="name"
                className="input w-full"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-600 dark:text-[#EF5350] mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="email">{t('email')}</label>
              <input
                type="email"
                id="email"
                className="input w-full"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600 dark:text-[#EF5350] mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="company">{t('company')}</label>
              <input
                type="text"
                id="company"
                className="input w-full"
                {...register('company')}
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">{t('phone')}</label>
              <input
                type="tel"
                id="phone"
                className="input w-full"
                {...register('phone')}
              />
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {STEPS[currentStep] === 'review' && (
          <div className="space-y-8">
            <p className="text-body text-gray-warm">{t('reviewIntro')}</p>

            {/* Artworks summary */}
            <div>
              <h3 className="text-body-lg font-medium mb-3">{t('stepArtworks')}</h3>
              <div className="flex flex-wrap gap-3">
                {selectedArtworks.map((artwork) => (
                  <div key={artwork.id} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-2 border border-gray-light dark:border-[#333333]">
                    <div className="w-8 h-8 relative flex-shrink-0">
                      {artwork.image_thumbnail_url || artwork.image_url ? (
                        <Image
                          src={artwork.image_thumbnail_url || artwork.image_url}
                          alt={artwork.title}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <ImagePlaceholder />
                      )}
                    </div>
                    <span className="text-sm">{artwork.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* License type summary */}
            <div>
              <h3 className="text-body-lg font-medium mb-1">{t('stepLicenseType')}</h3>
              <p className="text-body">{selectedLicenseType?.name}</p>
            </div>

            {/* Usage details summary */}
            <div>
              <h3 className="text-body-lg font-medium mb-1">{t('stepDetails')}</h3>
              <dl className="space-y-1 text-body">
                {watch('territory') && (
                  <div className="flex gap-2">
                    <dt className="text-gray-warm">{t('territory')}:</dt>
                    <dd>{watch('territory')}</dd>
                  </div>
                )}
                {watch('duration') && (
                  <div className="flex gap-2">
                    <dt className="text-gray-warm">{t('duration')}:</dt>
                    <dd>{watch('duration')}</dd>
                  </div>
                )}
                {watch('print_run') && (
                  <div className="flex gap-2">
                    <dt className="text-gray-warm">{t('printRun')}:</dt>
                    <dd>{watch('print_run')}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-warm">{t('usageDescription')}:</dt>
                  <dd className="mt-1">{watch('usage_description')}</dd>
                </div>
              </dl>
            </div>

            {/* Contact summary */}
            <div>
              <h3 className="text-body-lg font-medium mb-1">{t('stepContact')}</h3>
              <dl className="space-y-1 text-body">
                <div className="flex gap-2">
                  <dt className="text-gray-warm">{t('name')}:</dt>
                  <dd>{watch('name')}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-gray-warm">{t('email')}:</dt>
                  <dd>{watch('email')}</dd>
                </div>
                {watch('company') && (
                  <div className="flex gap-2">
                    <dt className="text-gray-warm">{t('company')}:</dt>
                    <dd>{watch('company')}</dd>
                  </div>
                )}
                {watch('phone') && (
                  <div className="flex gap-2">
                    <dt className="text-gray-warm">{t('phone')}:</dt>
                    <dd>{watch('phone')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {submitResult && !submitResult.success && (
              <p className="text-sm text-red-600 dark:text-[#EF5350]">{submitResult.message}</p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-10 pt-6 border-t border-gray-light dark:border-[#333333]">
          <button
            type="button"
            onClick={goBack}
            className={`btn-secondary px-6 py-2 ${currentStep === 0 ? 'invisible' : ''}`}
          >
            {t('back')}
          </button>

          {STEPS[currentStep] === 'review' ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-8 py-2 disabled:opacity-50"
            >
              {isSubmitting ? t('submitting') : t('submit')}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              className="btn-primary px-6 py-2 disabled:opacity-50"
            >
              {t('next')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
