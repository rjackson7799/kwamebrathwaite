import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { errorResponse } from './response'

export type ActivityAction = 'create' | 'update' | 'delete' | 'status_change' | 'reorder'
export type EntityType = 'artwork' | 'exhibition' | 'press' | 'inquiry' | 'content' | 'media' | 'newsletter_subscriber' | 'hero_slide'

/**
 * Middleware to check if the request is authenticated
 * Returns the user if authenticated, or an error response if not
 */
export async function requireAuth(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      errorResponse: errorResponse('UNAUTHORIZED', 'Authentication required', 401),
    }
  }

  return { user, errorResponse: null }
}

/**
 * Log an activity to the activity_log table
 */
export async function logActivity(
  userEmail: string,
  action: ActivityAction,
  entityType: EntityType,
  entityId?: string,
  entityTitle?: string,
  changes?: Record<string, unknown>
) {
  try {
    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('activity_log').insert({
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_title: entityTitle,
      changes: changes || null,
    })
  } catch (error) {
    // Don't throw - activity logging should not break the main operation
    console.error('Failed to log activity:', error)
  }
}

/**
 * Helper to extract user email from auth context
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email || null
}
