import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { pressSummarizeUrlSchema } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import { generatePressSummary } from '@/lib/ai'

// POST /api/admin/press/summarize-url - Fetch and summarize an article URL
export async function POST(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const parsed = pressSummarizeUrlSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request',
        400,
        parsed.error.flatten().fieldErrors
      )
    }

    const { url, wordCount } = parsed.data

    const result = await generatePressSummary(url, wordCount)

    return successResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'

    // Differentiate between fetch errors and AI errors
    if (message.includes('Could not') || message.includes('does not point') || message.includes('HTTP ')) {
      return errorResponse('FETCH_ERROR', message, 422)
    }

    if (message.includes('OPENAI_API_KEY')) {
      return errorResponse('CONFIG_ERROR', message, 500)
    }

    console.error('Press summarize error:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, message, 500)
  }
}
