'use client'

import { useState } from 'react'
import { Wand2, Loader2 } from 'lucide-react'

interface GeneratedSEO {
  seo_title: string
  alt_text: string
  meta_title: string
  meta_description: string
}

interface SEOGenerateButtonProps {
  artworkId: string
  onGenerated: (seo: GeneratedSEO) => void
}

export function SEOGenerateButton({ artworkId, onGenerated }: SEOGenerateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/artworks/${artworkId}/generate-seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Generation failed')
      }

      onGenerated({
        seo_title: data.data.seo_title,
        alt_text: data.data.alt_text,
        meta_title: data.data.meta_title,
        meta_description: data.data.meta_description,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate SEO')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-3.5 h-3.5" />
            Auto-generate
          </>
        )}
      </button>
    </div>
  )
}
