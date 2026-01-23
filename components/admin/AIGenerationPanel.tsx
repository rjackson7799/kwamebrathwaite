'use client'

import { useState } from 'react'
import { Sparkles, Wand2, Check, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Generated content structure from AI
 */
interface GeneratedContent {
  description: string
  short_description: string
  seo_title: string
  alt_text: string
  suggested_tags: string[]
  confidence_score: number
  translations: {
    fr: {
      description: string
      short_description: string
      seo_title: string
      alt_text: string
    }
    ja: {
      description: string
      short_description: string
      seo_title: string
      alt_text: string
    }
  }
  metadata?: {
    tokens_used: number
    estimated_cost_usd: number
    processing_time_ms: number
    prompt_version: string
  }
}

interface AIGenerationPanelProps {
  artworkId: string
  imageUrl: string
  currentMetadata: {
    title?: string
    year?: number | null
    medium?: string | null
    dimensions?: string | null
    series?: string | null
  }
  onGenerated: (content: GeneratedContent) => void
  disabled?: boolean
}

type GenerationStatus = 'idle' | 'analyzing' | 'generating' | 'translating' | 'complete' | 'error'

export function AIGenerationPanel({
  artworkId,
  imageUrl,
  currentMetadata,
  onGenerated,
  disabled = false,
}: AIGenerationPanelProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFullPreview, setShowFullPreview] = useState(false)

  const handleGenerate = async () => {
    if (!imageUrl) {
      setError('Please upload an image first')
      return
    }

    setStatus('analyzing')
    setError(null)
    setGeneratedContent(null)

    try {
      // Brief delay to show analyzing state
      await new Promise((resolve) => setTimeout(resolve, 500))
      setStatus('generating')

      const response = await fetch(`/api/admin/artworks/${artworkId}/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          metadata: {
            title: currentMetadata.title,
            year: currentMetadata.year,
            medium: currentMetadata.medium,
            dimensions: currentMetadata.dimensions,
            series: currentMetadata.series,
          },
          options: {
            regenerate: true,
            include_translations: true,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Generation failed')
      }

      setStatus('translating')
      // Brief delay to show translating state
      await new Promise((resolve) => setTimeout(resolve, 300))

      setStatus('complete')
      setGeneratedContent(data.data)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to generate description')
    }
  }

  const handleApplyAll = () => {
    if (generatedContent) {
      onGenerated(generatedContent)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return 'bg-green-500'
    if (score >= 0.7) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.85) return 'High confidence'
    if (score >= 0.7) return 'Medium confidence'
    return 'Low confidence - review recommended'
  }

  const isLoading = status === 'analyzing' || status === 'generating' || status === 'translating'

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">AI Description Generator</h3>
            <p className="text-sm text-gray-600">
              Generate exhibition-quality descriptions in seconds
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={disabled || !imageUrl || isLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Generate with AI
            </>
          )}
        </button>
      </div>

      {/* No image warning */}
      {!imageUrl && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Upload an image to enable AI description generation</span>
        </div>
      )}

      {/* Loading Steps */}
      {isLoading && (
        <div className="space-y-3 mt-4">
          <LoadingStep
            label="Analyzing image with AI vision..."
            active={status === 'analyzing'}
            complete={status === 'generating' || status === 'translating'}
          />
          <LoadingStep
            label="Generating exhibition-quality description..."
            active={status === 'generating'}
            complete={status === 'translating'}
          />
          <LoadingStep
            label="Translating to French and Japanese..."
            active={status === 'translating'}
            complete={false}
          />
        </div>
      )}

      {/* Error State */}
      {status === 'error' && error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md mt-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">Generation Failed</p>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Generated Content Preview */}
      {status === 'complete' && generatedContent && (
        <div className="mt-4 space-y-4">
          {/* Confidence Score */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${getConfidenceColor(generatedContent.confidence_score)}`}
                style={{ width: `${generatedContent.confidence_score * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[140px]">
              {Math.round(generatedContent.confidence_score * 100)}% -{' '}
              {getConfidenceLabel(generatedContent.confidence_score)}
            </span>
          </div>

          {/* Preview Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Generated Content Preview</h4>
              <button
                onClick={() => setShowFullPreview(!showFullPreview)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showFullPreview ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show more
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {/* Description */}
              <div>
                <span className="font-medium text-gray-900">Description:</span>
                <p className={`mt-1 text-gray-700 ${showFullPreview ? '' : 'line-clamp-3'}`}>
                  {generatedContent.description}
                </p>
              </div>

              {/* Short Description */}
              {showFullPreview && (
                <div>
                  <span className="font-medium text-gray-900">Short Description:</span>
                  <p className="mt-1 text-gray-700">{generatedContent.short_description}</p>
                </div>
              )}

              {/* SEO Title */}
              <div>
                <span className="font-medium text-gray-900">SEO Title:</span>
                <p className="mt-1 text-gray-700">{generatedContent.seo_title}</p>
              </div>

              {/* Alt Text */}
              {showFullPreview && (
                <div>
                  <span className="font-medium text-gray-900">Alt Text:</span>
                  <p className="mt-1 text-gray-700">{generatedContent.alt_text}</p>
                </div>
              )}

              {/* Tags */}
              <div>
                <span className="font-medium text-gray-900">Suggested Tags:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {generatedContent.suggested_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              {showFullPreview && generatedContent.metadata && (
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                  <span>
                    {generatedContent.metadata.tokens_used} tokens | $
                    {generatedContent.metadata.estimated_cost_usd.toFixed(4)} |{' '}
                    {(generatedContent.metadata.processing_time_ms / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyAll}
              className="w-full mt-4 py-2.5 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              Apply All Generated Content
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Loading step indicator
 */
function LoadingStep({
  label,
  active,
  complete,
}: {
  label: string
  active: boolean
  complete: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 transition-opacity ${
        complete ? 'opacity-60' : active ? 'opacity-100' : 'opacity-40'
      }`}
    >
      {complete ? (
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-3 h-3 text-green-600" />
        </div>
      ) : active ? (
        <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
      )}
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}
