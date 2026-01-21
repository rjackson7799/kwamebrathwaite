import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'

// GET /api/admin/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()

    // Fetch all counts in parallel
    const [
      artworksResult,
      exhibitionsResult,
      pendingInquiriesResult,
      subscribersResult,
    ] = await Promise.all([
      // Total artworks
      supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true }),

      // Total exhibitions
      supabase
        .from('exhibitions')
        .select('*', { count: 'exact', head: true }),

      // Pending inquiries (status = 'new')
      supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),

      // Total newsletter subscribers
      supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true }),
    ])

    // Check for errors
    if (artworksResult.error) {
      console.error('Error fetching artworks count:', artworksResult.error)
    }
    if (exhibitionsResult.error) {
      console.error('Error fetching exhibitions count:', exhibitionsResult.error)
    }
    if (pendingInquiriesResult.error) {
      console.error('Error fetching inquiries count:', pendingInquiriesResult.error)
    }
    if (subscribersResult.error) {
      console.error('Error fetching subscribers count:', subscribersResult.error)
    }

    return successResponse({
      totalArtworks: artworksResult.count ?? 0,
      exhibitions: exhibitionsResult.count ?? 0,
      pendingInquiries: pendingInquiriesResult.count ?? 0,
      subscribers: subscribersResult.count ?? 0,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch dashboard statistics', 500)
  }
}
