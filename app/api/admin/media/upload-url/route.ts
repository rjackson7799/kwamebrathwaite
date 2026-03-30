import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'

const VALID_BUCKETS = ['artworks', 'thumbnails', 'exhibitions', 'press', 'hero', 'about', 'archive'] as const

// POST /api/admin/media/upload-url
// Returns a signed upload URL so the client can upload directly to Supabase Storage,
// bypassing Vercel's ~4.5MB serverless function body size limit.
export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { bucket, filename, contentType } = body

    if (!bucket || !VALID_BUCKETS.includes(bucket as (typeof VALID_BUCKETS)[number])) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(', ')}`,
        400
      )
    }
    if (!filename || !contentType) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'filename and contentType are required', 400)
    }
    if (!contentType.startsWith('image/')) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Only image files are allowed', 400)
    }

    const supabase = createAdminClient()

    // Generate unique path (same pattern as upload/route.ts)
    const ext = (filename as string).split('.').pop()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const path = `${timestamp}-${randomStr}.${ext}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error || !data) {
      console.error('Signed URL error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, error?.message || 'Failed to create upload URL', 500)
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

    return successResponse({ signedUrl: data.signedUrl, token: data.token, path, publicUrl })
  } catch (error) {
    console.error('Error creating upload URL:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create upload URL', 500)
  }
}
