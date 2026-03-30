/**
 * POST /api/admin/press/[id]/generate-seo
 *
 * Generate SEO metadata for a press item using GPT-4o.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'
import OpenAI from 'openai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const { id } = await params

  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pressItem, error: fetchError } = await (supabase as any)
      .from('press')
      .select('id, title, publication, author, excerpt, press_type')
      .eq('id', id)
      .single()

    if (fetchError || !pressItem) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Press item not found', 404)
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return errorResponse('OPENAI_CONFIG_ERROR', 'OpenAI API is not properly configured', 500)
    }

    const openai = new OpenAI({ apiKey })

    const excerptText = pressItem.excerpt
      ? pressItem.excerpt.replace(/<[^>]*>/g, '').substring(0, 500)
      : ''

    const prompt = `Generate SEO metadata for a press article about photographer Kwame Brathwaite.

Article details:
- Title: ${pressItem.title}
- Publication: ${pressItem.publication || 'Unknown'}
- Author: ${pressItem.author || 'Unknown'}
- Type: ${pressItem.press_type || 'article'}
${excerptText ? `- Excerpt: ${excerptText}` : ''}

Generate:
1. meta_title: An SEO-optimized page title (max 60 characters). Include "Kwame Brathwaite" if not already in the title.
2. meta_description: A compelling meta description for search results (max 160 characters). Should encourage clicks.

Respond in JSON format:
{
  "meta_title": "...",
  "meta_description": "..."
}`

    const startTime = Date.now()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO specialist for a photography archive website. Generate concise, accurate SEO metadata. Respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })

    const processingTime = Date.now() - startTime
    const content = response.choices[0]?.message?.content

    if (!content) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'No response from AI', 500)
    }

    const seo = JSON.parse(content)

    return successResponse({
      meta_title: seo.meta_title || '',
      meta_description: seo.meta_description || '',
      metadata: {
        tokens_used: (response.usage?.total_tokens || 0),
        processing_time_ms: processingTime,
      },
    })
  } catch (error) {
    console.error('Press SEO generation error:', error)

    if (error instanceof Error && error.message.includes('rate limit')) {
      return errorResponse(ErrorCodes.RATE_LIMIT, 'AI service rate limit exceeded. Please try again later.', 429)
    }

    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate SEO metadata. Please try again.', 500)
  }
}
