import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { generateVenueDescriptionSchema } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import OpenAI from 'openai'

let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

// POST /api/admin/exhibitions/generate-venue-description
export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = generateVenueDescriptionSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const { venue_url, venue_name } = result.data

    // Fetch venue page content
    let pageText = ''
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(venue_url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KwameBrathwaiteArchive/1.0)',
        },
      })
      clearTimeout(timeout)

      if (response.ok) {
        const html = await response.text()
        // Strip HTML tags and extract text content
        pageText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000) // Limit content sent to OpenAI
      }
    } catch (fetchError) {
      console.error('Failed to fetch venue URL:', fetchError)
      // Continue with just the venue name if fetch fails
    }

    const openai = getOpenAI()

    const prompt = pageText
      ? `Venue name: ${venue_name}\nVenue URL: ${venue_url}\n\nPage content:\n${pageText}`
      : `Venue name: ${venue_name}\nVenue URL: ${venue_url}\n\nNo page content available. Generate a brief description based on the venue name.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are writing a brief venue description for an art gallery/museum website dedicated to photographer Kwame Brathwaite. Generate 2-3 sentences describing this venue based on the provided content. Focus on what makes this venue notable for art exhibitions. Be factual and concise.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const description = completion.choices[0]?.message?.content?.trim() || ''

    if (!description) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to generate venue description',
        500
      )
    }

    return successResponse({ description })
  } catch (error) {
    console.error('Error generating venue description:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
