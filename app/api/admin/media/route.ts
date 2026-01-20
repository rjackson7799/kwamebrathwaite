import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

// Valid storage buckets
const VALID_BUCKETS = ['artworks', 'thumbnails', 'exhibitions', 'press'] as const
type Bucket = (typeof VALID_BUCKETS)[number]

interface MediaFile {
  id: string
  name: string
  bucket: string
  size: number
  created_at: string
  updated_at: string
  url: string
}

// GET /api/admin/media - List files from storage buckets
export async function GET(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') as Bucket | 'all' | null
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '24', 10)
    const offset = (page - 1) * limit

    const supabase = await createAdminClient()
    const allFiles: MediaFile[] = []

    // Determine which buckets to query
    const bucketsToQuery: Bucket[] = bucket && bucket !== 'all' && VALID_BUCKETS.includes(bucket as Bucket)
      ? [bucket as Bucket]
      : [...VALID_BUCKETS]

    // Fetch files from each bucket
    for (const bucketName of bucketsToQuery) {
      console.log(`[Media API] Querying bucket: ${bucketName}`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).storage
        .from(bucketName)
        .list(undefined, {
          limit: 1000, // Get all files for filtering/counting
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) {
        console.error(`[Media API] Error from ${bucketName}:`, JSON.stringify(error, null, 2))
        continue // Skip bucket on error, don't fail entire request
      }

      console.log(`[Media API] ${bucketName} returned ${data?.length || 0} items:`,
        data?.slice(0, 5).map((f: { name: string; id: string | null }) => ({ name: f.name, id: f.id })))

      if (data) {
        // Filter out folders (items with id null or empty metadata)
        const files = data.filter((item: { id: string | null; name: string }) => 
          item.id && !item.name.endsWith('/')
        )

        for (const file of files) {
          // Get public URL
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: { publicUrl } } = (supabase as any).storage
            .from(bucketName)
            .getPublicUrl(file.name)

          allFiles.push({
            id: file.id,
            name: file.name,
            bucket: bucketName,
            size: file.metadata?.size || 0,
            created_at: file.created_at,
            updated_at: file.updated_at,
            url: publicUrl,
          })
        }
      }
    }

    // Filter by search term if provided
    let filteredFiles = allFiles
    if (search) {
      const searchLower = search.toLowerCase()
      filteredFiles = allFiles.filter((file) =>
        file.name.toLowerCase().includes(searchLower)
      )
    }

    // Sort by created_at descending (newest first)
    filteredFiles.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Calculate totals before pagination
    const total = filteredFiles.length

    // Apply pagination
    const paginatedFiles = filteredFiles.slice(offset, offset + limit)

    return successResponse(paginatedFiles, {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error listing media:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list media files', 500)
  }
}

// DELETE /api/admin/media - Delete a file from storage
export async function DELETE(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { bucket, filename } = body

    // Validate bucket
    if (!bucket || !VALID_BUCKETS.includes(bucket)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(', ')}`,
        400
      )
    }

    // Validate filename
    if (!filename || typeof filename !== 'string') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Filename is required',
        400
      )
    }

    const supabase = await createAdminClient()

    // Delete the file
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).storage
      .from(bucket)
      .remove([filename])

    if (error) {
      console.error('Error deleting file:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete file', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(
        userEmail,
        'delete',
        'media',
        undefined,
        `${bucket}/${filename}`
      )
    }

    return successResponse({ deleted: true, bucket, filename })
  } catch (error) {
    console.error('Error deleting media:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete file', 500)
  }
}
