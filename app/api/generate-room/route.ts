import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
} from '@/lib/api'
import { generateRoomSchema } from '@/lib/api/validation'

// Lazy-load OpenAI client
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

const SYSTEM_PROMPT_PREFIX =
  'A photorealistic interior room scene suitable for displaying fine art photography on the wall. The scene should be a frontal view of a wall with good lighting, no artwork on the wall, clean and elegant. The perspective should be straight-on, showing the wall prominently in the upper two-thirds and floor in the lower third. Room style:'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const clientIP = getClientIP(request)
    const ipRateLimit = rateLimit(`generate-room:${clientIP}`, 5, 300000) // 5 per 5 minutes

    if (!ipRateLimit.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Too many requests. Please try again later.',
        429
      )
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
    }

    // Validate with Zod
    const validationResult = generateRoomSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        validationResult.error.flatten()
      )
    }

    const { prompt, email, session_id } = validationResult.data

    // Session-level rate limit
    const sessionRateLimit = rateLimit(
      `generate-room:session:${session_id}`,
      3,
      86400000 // 24 hours
    )

    if (!sessionRateLimit.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Generation limit reached for this session.',
        429
      )
    }

    const supabase = await createClient()

    // Verify email exists in wall_view_leads and check generation count
    const { data: leadData } = await supabase
      .from('wall_view_leads')
      .select('id, generations_count')
      .eq('email', email.toLowerCase())
      .single()

    const lead = leadData as { id: string; generations_count: number } | null

    if (!lead) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Email not registered. Please register first.',
        400
      )
    }

    if (lead.generations_count >= 3) {
      return errorResponse(
        'GENERATION_LIMIT',
        'You have reached the maximum number of room generations.',
        429
      )
    }

    // Call DALL-E 3
    const openai = getOpenAIClient()

    let imageUrl: string
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `${SYSTEM_PROMPT_PREFIX} ${prompt}`,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        response_format: 'url',
      })

      imageUrl = response.data?.[0]?.url || ''

      if (!imageUrl) {
        return errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to generate room image.',
          500
        )
      }
    } catch (err) {
      // Handle DALL-E content policy rejection
      if (err instanceof OpenAI.APIError && err.code === 'content_policy_violation') {
        return errorResponse(
          'CONTENT_POLICY',
          'The prompt was rejected by content policy. Please try a different description.',
          400
        )
      }
      throw err
    }

    // Increment generations_count
    await supabase
      .from('wall_view_leads')
      .update({
        generations_count: lead.generations_count + 1,
        last_generated_at: new Date().toISOString(),
      } as never)
      .eq('id', lead.id)

    return successResponse({
      image_url: imageUrl,
      prompt,
    })
  } catch (error) {
    console.error('Generate room API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
