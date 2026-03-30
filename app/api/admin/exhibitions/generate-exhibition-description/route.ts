import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { generateExhibitionDescriptionSchema } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import OpenAI from 'openai'

let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

// POST /api/admin/exhibitions/generate-exhibition-description
export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = generateExhibitionDescriptionSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid request data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const { exhibition_url, exhibition_title } = result.data

    // Fetch exhibition page content
    let pageText = ''
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(exhibition_url, {
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
          .slice(0, 5000)
      }
    } catch (fetchError) {
      console.error('Failed to fetch exhibition URL:', fetchError)
      // Continue with just the title if fetch fails
    }

    const openai = getOpenAI()

    const prompt = pageText
      ? `Exhibition title: ${exhibition_title}\nExhibition URL: ${exhibition_url}\n\nPage content:\n${pageText}`
      : `Exhibition title: ${exhibition_title}\nExhibition URL: ${exhibition_url}\n\nNo page content available. Generate a brief description based on the exhibition title.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are writing an exhibition description for an art archive website dedicated to photographer Kwame Brathwaite. Generate 2–4 sentences describing this specific exhibition based on the provided content. Focus on the works shown, the themes, the cultural significance, and any notable aspects of the exhibition. Be factual and concise.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    })

    const description = completion.choices[0]?.message?.content?.trim() || ''

    if (!description) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to generate exhibition description',
        500
      )
    }

    return successResponse({ description })
  } catch (error) {
    console.error('Error generating exhibition description:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
