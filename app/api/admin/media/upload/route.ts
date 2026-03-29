import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'

const VALID_BUCKETS = ['artworks', 'thumbnails', 'exhibitions', 'press', 'hero', 'about', 'archive'] as const

// POST /api/admin/media/upload - Upload a file to storage
export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as string | null

    if (!file) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'File is required', 400)
    }

    if (!bucket || !VALID_BUCKETS.includes(bucket as (typeof VALID_BUCKETS)[number])) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(', ')}`,
        400
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Only image files are allowed', 400)
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'File size must be less than 10MB', 400)
    }

    const supabase = createAdminClient()

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${randomStr}.${ext}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload main image
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to upload file', 500)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename)

    // Upload thumbnail if requested
    let thumbnailUrl: string | null = null
    const generateThumb = formData.get('generateThumbnail') === 'true'

    if (generateThumb) {
      // Server-side thumbnail generation could be added here
      // For now, we skip it - the client can handle thumbnail generation separately if needed
    }

    return successResponse({ publicUrl, thumbnailUrl })
  } catch (error) {
    console.error('Error uploading file:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file', 500)
  }
}
