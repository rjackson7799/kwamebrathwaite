import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { exhibitionReminderSchema } from '@/lib/api/validation'
import { rateLimit, getClientIP } from '@/lib/api/rate-limit'
import type { ExhibitionReminderInsert, ExhibitionReminder } from '@/lib/supabase/types'
import { sendUserEmail, sendAdminEmail } from '@/lib/email/send'
import {
  ExhibitionReminderUserEmail,
  ExhibitionReminderAdminEmail,
} from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — 5 reminder requests per minute per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`reminder:${clientIP}`, 5, 60000)
    if (!rateLimitResult.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Too many requests. Please try again later.',
        429
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = exhibitionReminderSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid reminder data',
        400,
        validationResult.error.flatten().fieldErrors
      )
    }

    const { exhibition_id, name, email, reminder_type, locale, source, website } =
      validationResult.data

    // Honeypot check - spam bots fill this hidden field
    if (website && website.length > 0) {
      // Return success to not tip off bots, but don't actually save
      return successResponse(
        { id: 'blocked', message: 'Reminder request submitted successfully' },
        undefined,
        201
      )
    }

    // Service-role client to bypass RLS on public exhibition reminder inserts.
    const supabase = createAdminClient()

    // Fetch exhibition details for denormalization
    const { data: exhibitionData, error: fetchError } = await supabase
      .from('exhibitions')
      .select('title, venue, city, country, start_date, end_date')
      .eq('id', exhibition_id)
      .eq('status', 'published')
      .single()

    if (fetchError || !exhibitionData) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Exhibition not found', 404)
    }

    // Type assertion for exhibition data
    const exhibition = exhibitionData as {
      title: string
      venue: string | null
      city: string | null
      country: string | null
      start_date: string | null
      end_date: string | null
    }

    // Build reminder data with proper typing
    const reminderData: ExhibitionReminderInsert = {
      exhibition_id,
      name,
      email,
      reminder_type,
      exhibition_title: exhibition.title,
      exhibition_venue: exhibition.venue,
      exhibition_city: exhibition.city,
      exhibition_country: exhibition.country,
      exhibition_start_date: exhibition.start_date,
      exhibition_end_date: exhibition.end_date,
      locale,
      source,
      user_agent: request.headers.get('user-agent'),
    }

    // Insert reminder with denormalized exhibition data
    // Note: Type assertion needed until Supabase types are regenerated after running migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('exhibition_reminders') as any)
      .insert(reminderData)
      .select('id')
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to save reminder', 500)
    }

    const result = data as Pick<ExhibitionReminder, 'id'>

    const [userResult, adminResult] = await Promise.all([
      sendUserEmail(
        email,
        `Exhibition reminder set: ${exhibition.title}`,
        ExhibitionReminderUserEmail({
          name,
          exhibitionTitle: exhibition.title,
          exhibitionVenue: exhibition.venue,
          exhibitionCity: exhibition.city,
          exhibitionCountry: exhibition.country,
          exhibitionStartDate: exhibition.start_date,
          exhibitionEndDate: exhibition.end_date,
          reminderType: reminder_type,
        })
      ),
      sendAdminEmail(
        `New exhibition reminder: ${name}`,
        ExhibitionReminderAdminEmail({
          name,
          email,
          exhibitionTitle: exhibition.title,
          exhibitionVenue: exhibition.venue,
          reminderType: reminder_type,
          locale,
          source,
        })
      ),
    ])

    if (!userResult.success || !adminResult.success) {
      console.error('Exhibition reminder email send incomplete:', {
        reminderId: result.id,
        userEmail: userResult.success,
        adminEmail: adminResult.success,
      })
    }

    return successResponse(
      { id: result.id, message: 'Reminder request submitted successfully' },
      undefined,
      201
    )
  } catch (error) {
    console.error('Reminder API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    )
  }
}
