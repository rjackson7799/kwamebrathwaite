import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminReminderFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import { getPagination, createPaginationMetadata } from '@/lib/api/pagination'
import type { ExhibitionReminder } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)

    // Validate query parameters
    const validationResult = adminReminderFiltersSchema.safeParse(params)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        validationResult.error.flatten().fieldErrors
      )
    }

    const { page, limit, exhibition_id, reminder_type, q, sort, order } =
      validationResult.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    // Build query
    // Note: Type assertion needed until Supabase types are regenerated after running migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('exhibition_reminders') as any).select('*', { count: 'exact' })

    // Apply filters
    if (exhibition_id) {
      query = query.eq('exhibition_id', exhibition_id)
    }

    if (reminder_type) {
      query = query.eq('reminder_type', reminder_type)
    }

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,email.ilike.%${q}%,exhibition_title.ilike.%${q}%`
      )
    }

    // Apply sorting
    const sortField = sort || 'created_at'
    const sortOrder = order || 'desc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query as { data: ExhibitionReminder[] | null; count: number | null; error: Error | null }

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch reminders', 500)
    }

    const metadata = createPaginationMetadata(page, limit, count || 0)

    return successResponse(data || [], metadata)
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An error occurred',
      500
    )
  }
}
