import { resend, EMAIL_CONFIG } from './client'
import type { ReactElement } from 'react'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
}

/**
 * Send an email via Resend — fire and forget.
 * Logs errors but never throws, so API responses are never blocked.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Email not sent — RESEND_API_KEY not configured')
    return
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: options.to,
      subject: options.subject,
      react: options.react,
      replyTo: options.replyTo,
    })

    if (error) {
      console.error('Resend API error:', error)
      return
    }

    console.log(`Email sent: ${data?.id} → ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

/**
 * Send notification email to admin.
 */
export async function sendAdminEmail(subject: string, react: ReactElement): Promise<void> {
  return sendEmail({
    to: EMAIL_CONFIG.adminEmail,
    subject: `[Admin] ${subject}`,
    react,
  })
}

/**
 * Send email to a user with admin as reply-to.
 */
export async function sendUserEmail(
  to: string,
  subject: string,
  react: ReactElement
): Promise<void> {
  return sendEmail({
    to,
    subject,
    react,
    replyTo: EMAIL_CONFIG.adminEmail,
  })
}
